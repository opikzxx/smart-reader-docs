import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";


/**
 * POST /api/documents/upload
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
