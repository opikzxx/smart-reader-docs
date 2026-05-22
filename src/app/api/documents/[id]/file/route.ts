import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { withD1Retry, handleD1Error } from "@/lib/db/retry";
import { auth } from "@/auth";

/**
 * GET /api/documents/[id]/file
 */
export async function GET(
  _request: NextRequest,
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
    const documentId = parseInt(id, 10);

    if (isNaN(documentId)) {
      return NextResponse.json(
        { error: "Invalid document ID" },
        { status: 400 }
      );
    }

    const { env } = getCloudflareContext();

    // Look up r2_key, scoped to the user
    const document = await withD1Retry(async () => {
      return env.DB.prepare(
        "SELECT r2_key, file_name FROM documents WHERE id = ? AND user_id = ?"
      )
        .bind(documentId, userId)
        .first<{ r2_key: string; file_name: string }>();
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found in database" },
        { status: 404 }
      );
    }

    // Fetch from R2
    const object = await env.R2_BUCKET.get(document.r2_key);

    if (!object) {
      return NextResponse.json(
        { error: `File not found in storage (key: ${document.r2_key})` },
        { status: 404 }
      );
    }

    // Infer a content-type from the stored metadata or the filename
    const headers = new Headers();
    const contentType =
      object.httpMetadata?.contentType ||
      inferContentType(document.file_name) ||
      "application/octet-stream";

    headers.set("Content-Type", contentType);
    headers.set("Cache-Control", "private, max-age=3600");
    headers.set(
      "Content-Disposition",
      `inline; filename="${document.file_name}"`
    );

    return new Response(object.body, { headers });
  } catch (error) {
    return handleD1Error(error, "Fetch document file");
  }
}

function inferContentType(fileName: string): string | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".pdf")) return "application/pdf";
  return null;
}
