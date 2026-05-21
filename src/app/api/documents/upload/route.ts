import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const runtime = "edge";

/**
 * POST /api/documents/upload
 *
 * Prepares a document upload by generating a unique ID and r2_key.
 * Returns the r2_key and a url for the client to PUT the file to.
 * The url points to the PUT /api/documents/upload/[id]?r2_key=... endpoint
 * which uploads directly to R2 using the native binding.
 *
 * Request body: { file_name: string }
 * Response: { url: string, r2_key: string }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { file_name: unknown };
    const { file_name } = body;

    if (!file_name || typeof file_name !== "string" || file_name.trim() === "") {
      return NextResponse.json(
        { error: "file_name is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    // Validate that R2 bucket binding is available
    const { env } = getCloudflareContext();
    if (!env.R2_BUCKET) {
      return NextResponse.json(
        { error: "Storage service unavailable" },
        { status: 503 }
      );
    }

    // Generate a unique ID for the document
    const upload_id = crypto.randomUUID();
    const r2_key = `documents/${upload_id}/${file_name}`;

    // Build the upload URL pointing to the PUT endpoint
    const requestUrl = new URL(request.url);
    const url = `${requestUrl.origin}/api/documents/upload/${upload_id}?r2_key=${encodeURIComponent(r2_key)}`;

    return NextResponse.json({ url, r2_key });
  } catch (error) {
    console.error("Failed to prepare upload:", error);
    return NextResponse.json(
      { error: "Failed to prepare upload" },
      { status: 500 }
    );
  }
}
