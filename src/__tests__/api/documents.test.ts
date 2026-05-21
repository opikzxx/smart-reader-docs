import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
vi.mock("@/auth", () => ({
  auth: () => Promise.resolve({ user: { id: "user-123", name: "Test User" } }),
}));

// Mock getCloudflareContext
const mockRun = vi.fn();
const mockBind = vi.fn(() => ({ run: mockRun }));
const mockPrepare = vi.fn(() => ({ bind: mockBind }));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({
    env: {
      DB: {
        prepare: mockPrepare,
      },
    },
  }),
}));

import { POST } from "@/app/api/documents/route";

describe("POST /api/documents (JSON creation)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRun.mockResolvedValue({
      meta: { last_row_id: 1 },
    });
  });

  it("creates a document with valid input and returns 201", async () => {
    const request = new Request("http://localhost/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file_name: "invoice.pdf",
        r2_key: "documents/1/invoice.pdf",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe(1);
    expect(data.file_name).toBe("invoice.pdf");
    expect(data.r2_key).toBe("documents/1/invoice.pdf");
    expect(data.status).toBe("uploaded");
    expect(data.user_id).toBe("user-123");
    expect(data.vendor_name).toBeNull();
    expect(data.date).toBeNull();
    expect(data.total).toBeNull();
    expect(data.currency).toBeNull();
    expect(data.confidence_scores).toBeNull();
    expect(data.created_at).toBeDefined();
    expect(data.updated_at).toBeDefined();
  });

  it("inserts into D1 with user_id", async () => {
    const request = new Request("http://localhost/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file_name: "receipt.png",
        r2_key: "documents/2/receipt.png",
      }),
    });

    await POST(request);

    expect(mockPrepare).toHaveBeenCalledWith(
      "INSERT INTO documents (file_name, r2_key, status, user_id, created_at, updated_at) VALUES (?, ?, 'uploaded', ?, ?, ?)"
    );
    expect(mockBind).toHaveBeenCalledWith(
      "receipt.png",
      "documents/2/receipt.png",
      "user-123",
      expect.any(String),
      expect.any(String)
    );
  });

  it("returns 400 when file_name is missing", async () => {
    const request = new Request("http://localhost/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ r2_key: "documents/1/file.pdf" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("file_name");
  });

  it("returns 400 when r2_key is missing", async () => {
    const request = new Request("http://localhost/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_name: "invoice.pdf" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("r2_key");
  });

  it("returns 500 when database insert fails", async () => {
    mockRun.mockRejectedValue(new Error("UNIQUE constraint failed"));

    const request = new Request("http://localhost/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file_name: "invoice.pdf",
        r2_key: "documents/1/invoice.pdf",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create document");
  });
});
