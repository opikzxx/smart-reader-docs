import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { getDisplayName, UserSession } from "./get-display-name";

/**
 * Property-based tests for display name fallback logic.
 *
 * **Validates: Requirements 7.6**
 */

describe("Feature: auth-system, Property 6: Name fallback to email", () => {
  /**
   * **Validates: Requirements 7.6**
   *
   * For any user session where the name field is null or undefined,
   * the dashboard SHALL display the user's email address in place of
   * the display name in both the navigation bar and the welcome message.
   */
  it("should use email as display name when name is null", () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        (email) => {
          const user: UserSession = { name: null, email };
          const result = getDisplayName(user);
          // Should use email (possibly truncated to 50 chars)
          expect(result).toBe(email.slice(0, 50));
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should use email as display name when name is undefined", () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        (email) => {
          const user: UserSession = { name: undefined, email };
          const result = getDisplayName(user);
          // Should use email (possibly truncated to 50 chars)
          expect(result).toBe(email.slice(0, 50));
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should use email as display name when name field is absent", () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        (email) => {
          const user: UserSession = { email };
          const result = getDisplayName(user);
          // Should use email (possibly truncated to 50 chars)
          expect(result).toBe(email.slice(0, 50));
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should fall back to 'User' when both name and email are null/undefined", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant({ name: null, email: null } as UserSession),
          fc.constant({ name: undefined, email: undefined } as UserSession),
          fc.constant({ name: null, email: undefined } as UserSession),
          fc.constant({ name: undefined, email: null } as UserSession),
          fc.constant({} as UserSession),
        ),
        (user) => {
          const result = getDisplayName(user);
          expect(result).toBe("User");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should prefer name over email when name is available", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.emailAddress(),
        (name, email) => {
          const user: UserSession = { name, email };
          const result = getDisplayName(user);
          // Should use name (possibly truncated), not email
          expect(result).toBe(name.slice(0, 50));
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should handle null/undefined user object by returning 'User'", () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(null), fc.constant(undefined)),
        (user) => {
          const result = getDisplayName(user);
          expect(result).toBe("User");
        }
      ),
      { numRuns: 100 }
    );
  });
});
