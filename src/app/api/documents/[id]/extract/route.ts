import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { parseLLMResponse } from "@/lib/documents/llm-parser";
import { withD1Retry, handleD1Error } from "@/lib/db/retry";
import type { ExtractionResult } from "@/lib/documents/types";


const EXTRACTION_PROMPT = `You are a financial document extraction AI. Analyze this image and determine if it is a valid financial document (invoice, receipt, bill, quotation, purchase order, etc.).

IMPORTANT RULES:
1. If the image is NOT a financial document (e.g. a photo of a person, landscape, random object, meme, screenshot of non-financial content), return: {"error": "not_a_document", "reason": "This image is not a financial document"}
2. If the image is too blurry, dark, tilted, or unreadable to extract data reliably, return: {"error": "unreadable", "reason": "Document is too blurry/dark/tilted to read"}
3. If it IS a valid financial document, extract the data as described below.

For valid financial documents, return a JSON object with:
- vendor_name: string or null (company/vendor name)
- date: string or null (date in YYYY-MM-DD format)
- total: number or null (total amount)
- currency: string or null (3-letter ISO 4217 currency code, e.g. IDR, USD, EUR)
- items: array of {description: string, quantity: number, unit_price: number, amount: number} (line items, empty array if none found)
- confidence_scores: {vendor_name: number, date: number, total: number, currency: number, items: number} (each 0.0-1.0, where 0.0 means completely uncertain and 1.0 means fully confident)

Guidelines for confidence_scores:
- Set below 0.5 if the field was guessed or partially visible
- Set below 0.3 if the field could not be determined at all
- Set above 0.8 only if clearly readable

Return ONLY valid JSON, no markdown or explanation.`;

/**
 * POST /api/documents/[id]/extract
 *
 * Triggers AI extraction on a document:
 * 1. Validates document exists and is not already processing
 * 2. Sets status to "processing"
 * 3. Fetches file from R2 and encodes as Base64
 * 4. Sends to Gemini 1.5 Flash Vision API
 * 5. Parses response and stores result in D1
 * 6. Sets status to "review"
 *
 * On any failure: sets status to "review" with empty extraction result.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "Document ID is required" },
      { status: 400 }
    );
  }

  const { env } = getCloudflareContext();

  // 1. Fetch document from D1
  let document;
  try {
    document = await withD1Retry(async () => {
      return env.DB.prepare("SELECT * FROM documents WHERE id = ?")
        .bind(id)
        .first<{
          id: number;
          file_name: string;
          r2_key: string;
          status: string;
          vendor_name: string | null;
          date: string | null;
          total: number | null;
          currency: string | null;
          confidence_scores: string | null;
          created_at: string;
          updated_at: string;
        }>();
    });
  } catch (error) {
    return handleD1Error(error, "Fetch document for extraction");
  }

  if (!document) {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 }
    );
  }

  // 2. Reject if already processing
  if (document.status === "processing") {
    return NextResponse.json(
      { error: "Extraction already in progress" },
      { status: 409 }
    );
  }

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  // 3. Set status to "processing"
  try {
    await withD1Retry(async () => {
      return env.DB.prepare(
        "UPDATE documents SET status = 'processing', updated_at = ? WHERE id = ?"
      )
        .bind(now, id)
        .run();
    });
  } catch (error) {
    return handleD1Error(error, "Update document status");
  }

  let extractionResult: ExtractionResult;

  try {
    // 4. Fetch file from R2
    const r2Object = await env.R2_BUCKET.get(document.r2_key);

    if (!r2Object) {
      throw new Error("File not found in R2");
    }

    // 5. Convert to Base64
    const arrayBuffer = await r2Object.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64Data = btoa(binary);

    // Determine MIME type from the R2 object metadata or file extension
    const mimeType = r2Object.httpMetadata?.contentType || getMimeTypeFromFileName(document.file_name);

    // 6. Send to Gemini 1.5 Flash Vision API with 60-second timeout
    const apiKey = (env as unknown as Record<string, string>).GOOGLE_AI_API_KEY;

    if (!apiKey) {
      throw new Error("GOOGLE_AI_API_KEY not configured");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data,
                  },
                },
                {
                  text: EXTRACTION_PROMPT,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
          },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorBody}`);
    }

    const geminiData = (await geminiResponse.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    // 7. Extract text from Gemini response
    const responseText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error("No text content in Gemini response");
    }

    console.log(responseText);
    // 8. Parse LLM response — check for error responses first
    let parsedResponse: unknown;
    try {
      const cleaned = responseText.trim().replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```$/, '');
      parsedResponse = JSON.parse(cleaned);
    } catch {
      throw new Error("Failed to parse AI response as JSON");
    }

    // Check if AI reported the document as unreadable or not a document
    if (parsedResponse && typeof parsedResponse === 'object' && 'error' in parsedResponse) {
      const errorResponse = parsedResponse as { error: string; reason?: string };
      throw new Error(
        errorResponse.error === 'not_a_document'
          ? 'This image is not a financial document'
          : errorResponse.reason || 'Document could not be read'
      );
    }

    extractionResult = parseLLMResponse(responseText);
  } catch (error) {
    console.error("Extraction failed:", error);
    const errorMessage = error instanceof Error ? error.message : 'Extraction failed';
    // On failure: set status back to 'uploaded' (valid in CHECK constraint)
    const failedAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    try {
      await withD1Retry(async () => {
        return env.DB.prepare(
          "UPDATE documents SET status = 'uploaded', updated_at = ? WHERE id = ?"
        )
          .bind(failedAt, id)
          .run();
      });
    } catch (updateError) {
      console.error("Failed to update document status:", updateError);
    }

    // Return error response so client knows extraction failed
    return NextResponse.json({
      error: errorMessage,
      status: 'failed',
      id: Number(id),
    }, { status: 422 });
  }

  // 9. Store extraction result in D1
  const updatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  try {
    await withD1Retry(async () => {
      return env.DB.prepare(
        `UPDATE documents 
         SET vendor_name = ?, date = ?, total = ?, currency = ?, 
             confidence_scores = ?, status = 'review', updated_at = ?
         WHERE id = ?`
      )
        .bind(
          extractionResult.vendor_name,
          extractionResult.date,
          extractionResult.total,
          extractionResult.currency,
          JSON.stringify(extractionResult.confidence_scores),
          updatedAt,
          id
        )
        .run();
    });

    // Delete existing extracted items for this document
    await withD1Retry(async () => {
      return env.DB.prepare(
        "DELETE FROM extracted_items WHERE document_id = ?"
      )
        .bind(id)
        .run();
    });

    // Insert new extracted items
    for (const item of extractionResult.items) {
      await withD1Retry(async () => {
        return env.DB.prepare(
          "INSERT INTO extracted_items (document_id, description, quantity, unit_price, amount) VALUES (?, ?, ?, ?, ?)"
        )
          .bind(id, item.description, item.quantity, item.unit_price, item.amount)
          .run();
      });
    }

    // 10. Fetch the updated document with items to return
    const updatedDocument = await withD1Retry(async () => {
      return env.DB.prepare("SELECT * FROM documents WHERE id = ?")
        .bind(id)
        .first();
    });

    const itemsResult = await withD1Retry(async () => {
      return env.DB.prepare(
        "SELECT * FROM extracted_items WHERE document_id = ?"
      )
        .bind(id)
        .all();
    });

    // Parse confidence_scores from JSON string
    let confidenceScores = null;
    if (updatedDocument?.confidence_scores && typeof updatedDocument.confidence_scores === "string") {
      try {
        confidenceScores = JSON.parse(updatedDocument.confidence_scores as string);
      } catch {
        confidenceScores = null;
      }
    }

    return NextResponse.json({
      ...updatedDocument,
      confidence_scores: confidenceScores,
      items: itemsResult.results,
    });
  } catch (error) {
    return handleD1Error(error, "Store extraction result");
  }
}

/**
 * Determines MIME type from file extension as a fallback.
 */
function getMimeTypeFromFileName(fileName: string): string {
  const ext = fileName.toLowerCase().split(".").pop();
  switch (ext) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}
