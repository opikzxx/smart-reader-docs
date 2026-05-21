import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * Property 4: Static asset paths are excluded from middleware interception
 *
 * For any URL path string that starts with "/_next/static", "/_next/image",
 * or "/favicon", the middleware matcher pattern SHALL NOT match that path
 * (i.e., the path is excluded from middleware processing).
 *
 * **Validates: Requirements 3.5**
 */

// The middleware matcher regex from src/middleware.ts:
// matcher: ["/((?!_next/static|_next/image|favicon).*)"]
//
// Next.js wraps the matcher pattern to test against the full pathname.
// The pattern "/((?!_next/static|_next/image|favicon).*)" means:
// - Match a "/" followed by anything that does NOT start with
//   "_next/static", "_next/image", or "favicon"
//
// So paths like "/_next/static/...", "/_next/image/...", "/favicon..."
// will NOT match the matcher, meaning middleware won't intercept them.

const MATCHER_PATTERN = /^\/((?!_next\/static|_next\/image|favicon).*)/;

function matchesMiddleware(path: string): boolean {
  return MATCHER_PATTERN.test(path);
}

describe("Feature: auth-system, Property 4: Static asset paths are excluded from middleware interception", () => {
  const pathSuffix = fc.string({
    minLength: 0,
    maxLength: 50,
    unit: fc.constantFrom(
      ..."abcdefghijklmnopqrstuvwxyz0123456789-_./".split("")
    ),
  });

  it("paths starting with /_next/static are excluded from middleware", () => {
    fc.assert(
      fc.property(pathSuffix, (suffix) => {
        const path = `/_next/static${suffix}`;
        expect(matchesMiddleware(path)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("paths starting with /_next/image are excluded from middleware", () => {
    fc.assert(
      fc.property(pathSuffix, (suffix) => {
        const path = `/_next/image${suffix}`;
        expect(matchesMiddleware(path)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("paths starting with /favicon are excluded from middleware", () => {
    fc.assert(
      fc.property(pathSuffix, (suffix) => {
        const path = `/favicon${suffix}`;
        expect(matchesMiddleware(path)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
