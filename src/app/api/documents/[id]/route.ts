import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { withD1Retry, handleD1Error } from "@/lib/db/retry";
import { auth } from "@/auth";

export const runtime = "edge";

/**
 * GET /api/documents/[id]
 *
 * Returns a single document with its extracted items.
 * Only returns documents owned by the authenticated user.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    const documentId = parseInt(id, 10);

    if (isNaN(documentId)) {
      return NextResponse.json(
        { error: "Invalid document ID" },
        { status: 400 }
      );
    }

    const { env } = getCloudflareContext();

    // Query the document by ID and user_id
    const document = await withD1Retry(async () => {
      return env.DB.prepare("SELECT * FROM documents WHERE id = ? AND user_id = ?")
        .bind(documentId, userId)
        .first();
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Query extracted items for this document
    const itemsResult = await withD1Retry(async () => {
      return env.DB.prepare(
        "SELECT * FROM extracted_items WHERE document_id = ?"
      )
        .bind(documentId)
        .all();
    });

    // Parse confidence_scores from JSON string to object
    let confidenceScores = null;
    if (
      document.confidence_scores &&
      typeof document.confidence_scores === "string"
    ) {
      try {
        confidenceScores = JSON.parse(document.confidence_scores);
      } catch {
        confidenceScores = null;
      }
    }

    return NextResponse.json({
      ...document,
      confidence_scores: confidenceScores,
      items: itemsResult.results,
    });
  } catch (error) {
    return handleD1Error(error, "Fetch document");
  }
}

/**
 * PUT /api/documents/[id]
 *
 * Updates a document with reviewed data (review submission).
 * Accepts a ReviewSubmission payload, validates it, updates the document
 * fields and extracted items, and sets status to "ready".
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    const documentId = parseInt(id, 10);

    if (isNaN(documentId)) {
      return NextResponse.json(
        { error: "Invalid document ID" },
        { status: 400 }
      );
    }

    const body = await request.json() as {
      vendor_name?: string;
      date?: string;
      total?: number;
      currency?: string;
      items?: Array<{
        description: string;
        quantity: number;
        unit_price: number;
        amount: number;
      }>;
    };

    const { vendor_name, date, total, currency, items } = body;

    // Basic validation
    if (!vendor_name || typeof vendor_name !== "string" || vendor_name.trim() === "") {
      return NextResponse.json(
        { error: "vendor_name is required" },
        { status: 400 }
      );
    }

    if (!date || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "date must be in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    if (total === undefined || total === null || typeof total !== "number" || total < 0) {
      return NextResponse.json(
        { error: "total must be a number >= 0" },
        { status: 400 }
      );
    }

    if (!currency || typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency)) {
      return NextResponse.json(
        { error: "currency must be a valid 3-letter ISO 4217 code" },
        { status: 400 }
      );
    }

    const { env } = getCloudflareContext();
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

    // Verify document exists and belongs to user
    const existing = await withD1Retry(async () => {
      return env.DB.prepare("SELECT id FROM documents WHERE id = ? AND user_id = ?")
        .bind(documentId, userId)
        .first();
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Update document fields and set status to "ready"
    await withD1Retry(async () => {
      return env.DB.prepare(
        `UPDATE documents 
         SET vendor_name = ?, date = ?, total = ?, currency = ?, 
             status = 'ready', updated_at = ?
         WHERE id = ?`
      )
        .bind(vendor_name, date, total, currency, now, documentId)
        .run();
    });

    // Replace extracted items
    await withD1Retry(async () => {
      return env.DB.prepare("DELETE FROM extracted_items WHERE document_id = ?")
        .bind(documentId)
        .run();
    });

    if (items && items.length > 0) {
      for (const item of items) {
        await withD1Retry(async () => {
          return env.DB.prepare(
            "INSERT INTO extracted_items (document_id, description, quantity, unit_price, amount) VALUES (?, ?, ?, ?, ?)"
          )
            .bind(documentId, item.description, item.quantity, item.unit_price, item.amount)
            .run();
        });
      }
    }

    // Fetch updated document with items
    const updatedDocument = await withD1Retry(async () => {
      return env.DB.prepare("SELECT * FROM documents WHERE id = ?")
        .bind(documentId)
        .first();
    });

    const updatedItems = await withD1Retry(async () => {
      return env.DB.prepare("SELECT * FROM extracted_items WHERE document_id = ?")
        .bind(documentId)
        .all();
    });

    // Parse confidence_scores
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
      items: updatedItems.results,
    });
  } catch (error) {
    return handleD1Error(error, "Update document");
  }
}
