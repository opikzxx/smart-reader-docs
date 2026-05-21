import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";


/**
 * PUT /api/documents/upload/[id]
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
