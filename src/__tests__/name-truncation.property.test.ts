import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { truncateName } from "@/lib/truncate-name";

/**
 * Property 5: User display name truncation
 *
 * For any user name string of arbitrary length, the dashboard navigation
 * SHALL display at most 50 characters of that name.
 *
 * **Validates: Requirements 7.1**
 */

describe("Feature: auth-system, Property 5: User display name truncation", () => {
  it("truncateName always returns at most 50 characters for any input string", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 200 }), (name) => {
        const result = truncateName(name);
        expect(result.length).toBeLessThanOrEqual(50);
      }),
      { numRuns: 100 }
    );
  });

  it("truncateName preserves names that are already 50 characters or fewer", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 50 }), (name) => {
        const result = truncateName(name);
        expect(result).toBe(name);
      }),
      { numRuns: 100 }
    );
  });

  it("truncateName returns exactly 50 characters for names longer than 50", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 51, maxLength: 200 }), (name) => {
        const result = truncateName(name);
        expect(result.length).toBe(50);
        expect(result).toBe(name.slice(0, 50));
      }),
      { numRuns: 100 }
    );
  });
});
