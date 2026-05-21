import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { validateFile } from "@/lib/documents/validation";
import { withD1Retry, handleD1Error } from "@/lib/db/retry";
import { auth } from "@/auth";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    const statusesParam = searchParams.get("statuses");
    const vendorNameParam = searchParams.get("vendor_name");
    const dateFromParam = searchParams.get("date_from");
    const dateToParam = searchParams.get("date_to");

    const { env } = getCloudflareContext();

    let query = "SELECT * FROM documents";
    const conditions: string[] = ["user_id = ?"];
    const bindings: string[] = [userId];

    // Filter by statuses (comma-separated)
    if (statusesParam) {
      const statuses = statusesParam
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (statuses.length > 0) {
        const placeholders = statuses.map(() => "?").join(", ");
        conditions.push(`status IN (${placeholders})`);
        bindings.push(...statuses);
      }
    }

    // Filter by vendor_name (case-insensitive partial match)
    if (vendorNameParam) {
      conditions.push("vendor_name LIKE ?");
      bindings.push(`%${vendorNameParam}%`);
    }

    // Filter by date_from (created_at >= date_from)
    if (dateFromParam) {
      conditions.push("created_at >= ?");
      bindings.push(dateFromParam);
    }

    // Filter by date_to (created_at <= date_to)
    if (dateToParam) {
      conditions.push("created_at <= ?");
      bindings.push(dateToParam);
    }

    query += " WHERE " + conditions.join(" AND ");
    query += " ORDER BY created_at DESC";

    const result = await withD1Retry(async () => {
      const stmt = env.DB.prepare(query);
      return stmt.bind(...bindings).all();
    });

    return NextResponse.json({ documents: result.results }, { status: 200 });
  } catch (error) {
    return handleD1Error(error, "Fetch documents");
  }
}

/**
 * POST /api/documents
 *
 * Supports two content types:
 * - multipart/form-data: Upload file to R2 and create DB record (file upload flow)
 * - application/json: Create DB record with existing R2 key (JSON creation flow)
 */
export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    return handleFormDataUpload(request);
  }

  return handleJsonCreation(request);
}

/**
 * Handle FormData file upload flow:
 * Accepts a file via FormData, validates it, uploads to R2, and inserts a DB record.
 */
async function handleFormDataUpload(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "file is required in form data" },
        { status: 400 }
      );
    }

    // Validate file type and size
    const validation = validateFile({ type: file.type, size: file.size });
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error!.message },
        { status: 400 }
      );
    }

    const { env } = getCloudflareContext();
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

    // Generate a unique R2 key
    const uniqueId = crypto.randomUUID();
    const r2Key = `documents/${uniqueId}/${file.name}`;

    // Upload file to R2
    const fileBuffer = await file.arrayBuffer();
    await env.R2_BUCKET.put(r2Key, fileBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Insert document record into D1
    const result = await withD1Retry(async () => {
      return env.DB.prepare(
        "INSERT INTO documents (file_name, r2_key, status, user_id, created_at, updated_at) VALUES (?, ?, 'uploaded', ?, ?, ?)"
      )
        .bind(file.name, r2Key, userId, now, now)
        .run();
    });

    const document = {
      id: result.meta.last_row_id,
      file_name: file.name,
      r2_key: r2Key,
      status: "uploaded",
      user_id: userId,
      vendor_name: null,
      date: null,
      total: null,
      currency: null,
      confidence_scores: null,
      created_at: now,
      updated_at: now,
    };

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    return handleD1Error(error, "Upload document");
  }
}

/**
 * Handle JSON creation flow:
 * Accepts { file_name, r2_key } and inserts a DB record with status "uploaded".
 */
async function handleJsonCreation(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as {
      file_name: unknown;
      r2_key: unknown;
    };
    const { file_name, r2_key } = body;

    // Validate required fields
    if (
      !file_name ||
      typeof file_name !== "string" ||
      file_name.trim() === ""
    ) {
      return NextResponse.json(
        { error: "file_name is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    if (!r2_key || typeof r2_key !== "string" || r2_key.trim() === "") {
      return NextResponse.json(
        { error: "r2_key is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    const { env } = getCloudflareContext();
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

    const result = await withD1Retry(async () => {
      return env.DB.prepare(
        "INSERT INTO documents (file_name, r2_key, status, user_id, created_at, updated_at) VALUES (?, ?, 'uploaded', ?, ?, ?)"
      )
        .bind(file_name, r2_key, userId, now, now)
        .run();
    });

    const document = {
      id: result.meta.last_row_id,
      file_name,
      r2_key,
      status: "uploaded",
      user_id: userId,
      vendor_name: null,
      date: null,
      total: null,
      currency: null,
      confidence_scores: null,
      created_at: now,
      updated_at: now,
    };

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    return handleD1Error(error, "Create document");
  }
}
