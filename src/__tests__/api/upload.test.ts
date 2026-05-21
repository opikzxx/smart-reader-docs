import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getCloudflareContext
const mockPut = vi.fn();

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({
    env: {
      R2_BUCKET: {
        put: mockPut,
      },
    },
  }),
}));

import { POST } from "@/app/api/documents/upload/route";

describe("POST /api/documents/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns r2_key and url with valid file_name", async () => {
    const request = new Request("http://localhost/api/documents/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_name: "invoice.pdf" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.r2_key).toMatch(/^documents\/[a-f0-9-]+\/invoice\.pdf$/);
    expect(data.url).toContain("/api/documents/upload/");
    expect(data.url).toContain("r2_key=");
  });

  it("generates r2_key with format documents/{uuid}/{filename}", async () => {
    const request = new Request("http://localhost/api/documents/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_name: "receipt.png" }),
    });

    const response = await POST(request);
    const data = await response.json();

    const parts = data.r2_key.split("/");
    expect(parts[0]).toBe("documents");
    // UUID format check
    expect(parts[1]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
    expect(parts[2]).toBe("receipt.png");
  });

  it("returns url pointing to the PUT upload endpoint", async () => {
    const request = new Request("http://localhost/api/documents/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_name: "doc.pdf" }),
    });

    const response = await POST(request);
    const data = await response.json();

    const url = new URL(data.url);
    expect(url.pathname).toMatch(/^\/api\/documents\/upload\/[a-f0-9-]+$/);
    expect(url.searchParams.get("r2_key")).toBe(data.r2_key);
  });

  it("returns 400 when file_name is missing", async () => {
    const request = new Request("http://localhost/api/documents/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("file_name");
  });

  it("returns 400 when file_name is empty string", async () => {
    const request = new Request("http://localhost/api/documents/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_name: "" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("returns 400 when file_name is whitespace only", async () => {
    const request = new Request("http://localhost/api/documents/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_name: "   " }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("generates unique r2_keys for each request", async () => {
    const makeRequest = () =>
      new Request("http://localhost/api/documents/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_name: "invoice.pdf" }),
      });

    const response1 = await POST(makeRequest());
    const response2 = await POST(makeRequest());

    const data1 = await response1.json();
    const data2 = await response2.json();

    expect(data1.r2_key).not.toBe(data2.r2_key);
  });

  it("returns 500 when request body is invalid JSON", async () => {
    const request = new Request("http://localhost/api/documents/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
  });
});
