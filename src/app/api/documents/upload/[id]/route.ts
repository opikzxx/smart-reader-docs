import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const runtime = "edge";

/**
 * PUT /api/documents/upload/[id]
 *
 * Uploads a file to R2 using the native R2 bucket binding.
 * The client sends the raw file body with a Content-Type header.
 * The r2_key is passed as a query parameter or header.
 *
 * Query params: r2_key (required) - the R2 object key from the POST response
 * Body: raw file content
 * Response: { r2_key: string, success: true }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Upload ID is required" },
        { status: 400 }
      );
    }

    // Get the r2_key from the query parameter
    const r2_key = request.nextUrl.searchParams.get("r2_key");

    if (!r2_key || typeof r2_key !== "string") {
      return NextResponse.json(
        { error: "r2_key query parameter is required" },
        { status: 400 }
      );
    }

    // Validate that the r2_key matches the expected format for this upload ID
    if (!r2_key.startsWith(`documents/${id}/`)) {
      return NextResponse.json(
        { error: "r2_key does not match the upload ID" },
        { status: 400 }
      );
    }

    // Get the file body from the request
    const body = await request.arrayBuffer();

    if (!body || body.byteLength === 0) {
      return NextResponse.json(
        { error: "File body is required" },
        { status: 400 }
      );
    }

    // Get the R2 bucket binding and upload the file
    const { env } = getCloudflareContext();

    if (!env.R2_BUCKET) {
      return NextResponse.json(
        { error: "Storage service unavailable" },
        { status: 503 }
      );
    }

    const contentType = request.headers.get("content-type") || "application/octet-stream";

    await env.R2_BUCKET.put(r2_key, body, {
      httpMetadata: {
        contentType,
      },
    });

    return NextResponse.json({ r2_key, success: true });
  } catch (error) {
    console.error("Failed to upload file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
