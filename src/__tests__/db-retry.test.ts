/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withD1Retry, isD1ConnectionError, handleD1Error } from "@/lib/db/retry";

describe("isD1ConnectionError", () => {
  it("returns true for network errors", () => {
    expect(isD1ConnectionError(new Error("Network error"))).toBe(true);
  });

  it("returns true for connection refused errors", () => {
    expect(isD1ConnectionError(new Error("ECONNREFUSED"))).toBe(true);
  });

  it("returns true for timeout errors", () => {
    expect(isD1ConnectionError(new Error("Connection timeout"))).toBe(true);
  });

  it("returns true for unreachable errors", () => {
    expect(isD1ConnectionError(new Error("Database unreachable"))).toBe(true);
  });

  it("returns true for D1 internal errors", () => {
    expect(isD1ConnectionError(new Error("D1_ERROR: internal error"))).toBe(true);
  });

  it("returns true for service unavailable errors", () => {
    expect(isD1ConnectionError(new Error("Service unavailable"))).toBe(true);
  });

  it("returns false for non-Error values", () => {
    expect(isD1ConnectionError("string error")).toBe(false);
    expect(isD1ConnectionError(null)).toBe(false);
    expect(isD1ConnectionError(undefined)).toBe(false);
    expect(isD1ConnectionError(42)).toBe(false);
  });

  it("returns false for validation/constraint errors", () => {
    expect(isD1ConnectionError(new Error("UNIQUE constraint failed"))).toBe(false);
    expect(isD1ConnectionError(new Error("NOT NULL constraint failed"))).toBe(false);
    expect(isD1ConnectionError(new Error("CHECK constraint failed"))).toBe(false);
  });

  it("returns false for generic application errors", () => {
    expect(isD1ConnectionError(new Error("Document not found"))).toBe(false);
    expect(isD1ConnectionError(new Error("Invalid input"))).toBe(false);
  });
});

describe("withD1Retry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns result on first successful attempt", async () => {
    const operation = vi.fn().mockResolvedValue({ results: [] });

    const result = await withD1Retry(operation);

    expect(result).toEqual({ results: [] });
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("retries on connection error and succeeds on second attempt", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValue({ results: ["data"] });

    const promise = withD1Retry(operation, { delayMs: 2000 });

    // Advance past the delay
    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;

    expect(result).toEqual({ results: ["data"] });
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("retries up to maxAttempts times before throwing", async () => {
    const connectionError = new Error("Network error");
    const operation = vi.fn().mockRejectedValue(connectionError);

    const promise = withD1Retry(operation, { maxAttempts: 3, delayMs: 2000 });

    // Prevent unhandled rejection warning
    promise.catch(() => {});

    // Advance past all delays (flush microtasks between)
    await vi.advanceTimersByTimeAsync(4000);

    await expect(promise).rejects.toThrow("Network error");
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("does not retry on non-connection errors", async () => {
    const validationError = new Error("UNIQUE constraint failed");
    const operation = vi.fn().mockRejectedValue(validationError);

    await expect(withD1Retry(operation)).rejects.toThrow("UNIQUE constraint failed");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("uses default options (3 attempts, 2s delay)", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error("Connection timeout"))
      .mockRejectedValueOnce(new Error("Connection timeout"))
      .mockResolvedValue("success");

    const promise = withD1Retry(operation);

    // Advance past first delay
    await vi.advanceTimersByTimeAsync(2000);
    // Advance past second delay
    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;

    expect(result).toBe("success");
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("waits 2 seconds between retry attempts", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValue("success");

    const promise = withD1Retry(operation, { delayMs: 2000 });

    // Should not have retried yet
    expect(operation).toHaveBeenCalledTimes(1);

    // Advance 1 second - still waiting
    await vi.advanceTimersByTimeAsync(1000);
    expect(operation).toHaveBeenCalledTimes(1);

    // Advance another second - now should retry
    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;
    expect(result).toBe("success");
    expect(operation).toHaveBeenCalledTimes(2);
  });
});

describe("handleD1Error", () => {
  it("returns 503 for connection errors", () => {
    const error = new Error("Network error");
    const response = handleD1Error(error, "Fetch documents");

    expect(response.status).toBe(503);
  });

  it("returns 500 for non-connection errors", () => {
    const error = new Error("Something else went wrong");
    const response = handleD1Error(error, "Fetch documents");

    expect(response.status).toBe(500);
  });
});
