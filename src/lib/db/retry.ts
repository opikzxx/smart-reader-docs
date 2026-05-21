import { NextResponse } from "next/server";

/**
 * Configuration for D1 retry logic.
 */
export interface D1RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Delay between retries in milliseconds (default: 2000) */
  delayMs?: number;
}

const DEFAULT_OPTIONS: Required<D1RetryOptions> = {
  maxAttempts: 3,
  delayMs: 2000,
};

/**
 * Determines if an error is a D1 connection/unreachable error
 * that warrants a retry (as opposed to a validation or logic error).
 */
export function isD1ConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();

  // D1 connection-related error patterns
  const connectionPatterns = [
    "network",
    "unreachable",
    "connection",
    "timeout",
    "econnrefused",
    "econnreset",
    "socket",
    "dns",
    "d1_error",
    "internal error",
    "service unavailable",
    "too many requests",
    "worker exceeded",
  ];

  return connectionPatterns.some((pattern) => message.includes(pattern));
}

/**
 * Delays execution for the specified number of milliseconds.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wraps a D1 database operation with retry logic.
 *
 * Retries up to 3 times (configurable) with a 2-second delay between attempts
 * when a connection-type error is encountered. Non-connection errors (validation,
 * constraint violations, etc.) are thrown immediately without retry.
 *
 * @param operation - An async function that performs the D1 database operation
 * @param options - Optional retry configuration
 * @returns The result of the operation
 * @throws The last error if all retry attempts are exhausted
 */
export async function withD1Retry<T>(
  operation: () => Promise<T>,
  options?: D1RetryOptions
): Promise<T> {
  const { maxAttempts, delayMs } = { ...DEFAULT_OPTIONS, ...options };

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Only retry on connection-type errors
      if (!isD1ConnectionError(error)) {
        throw error;
      }

      console.error(
        `D1 connection error (attempt ${attempt}/${maxAttempts}):`,
        error instanceof Error ? error.message : error
      );

      // Don't delay after the last attempt
      if (attempt < maxAttempts) {
        await delay(delayMs);
      }
    }
  }

  // All retries exhausted
  throw lastError;
}

/**
 * Creates a 503 Service Unavailable response for D1 connection failures.
 * Used when all retry attempts have been exhausted.
 */
export function createD1ErrorResponse(): NextResponse {
  return NextResponse.json(
    { error: "Database connection failed. Please try again later." },
    { status: 503 }
  );
}

/**
 * Handles an error from a D1 operation, returning either a 503 response
 * (for connection errors after retries are exhausted) or a generic 500 response.
 */
export function handleD1Error(error: unknown, context: string): NextResponse {
  if (isD1ConnectionError(error)) {
    console.error(`${context}: D1 connection failed after all retries`, error);
    return createD1ErrorResponse();
  }

  console.error(`${context}:`, error);
  return NextResponse.json(
    { error: `Failed to ${context.toLowerCase()}` },
    { status: 500 }
  );
}
