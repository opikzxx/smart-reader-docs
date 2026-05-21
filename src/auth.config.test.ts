import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { authConfig } from "./auth.config";

/**
 * Property-based tests for auth callbacks defined in auth.config.ts
 *
 * Validates: Requirements 1.3, 2.2, 2.3, 2.4, 3.1, 3.2, 3.6
 */

// Extract callbacks for direct testing - assert they exist since our config always defines them
const jwt = authConfig.callbacks!.jwt!;
const session = authConfig.callbacks!.session!;
const authorized = authConfig.callbacks!.authorized!;

describe("Feature: auth-system, Property 1: Session data round-trip preservation", () => {
  /**
   * **Validates: Requirements 1.3, 2.2**
   *
   * For any valid user profile containing an id, name, email, and image,
   * passing that user through the `jwt` callback followed by the `session`
   * callback SHALL produce a session object containing the same id, name,
   * email, and image values.
   */
  it("should preserve user data through jwt → session round-trip", () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1 }),
          name: fc.string({ minLength: 1 }),
          email: fc.emailAddress(),
          image: fc.webUrl(),
        }),
        (userProfile) => {
          // Step 1: Pass user through jwt callback
          const initialToken = {
            name: userProfile.name,
            email: userProfile.email,
            picture: userProfile.image,
          };

          const tokenResult = jwt({
            token: initialToken,
            user: {
              id: userProfile.id,
              name: userProfile.name,
              email: userProfile.email,
              image: userProfile.image,
            },
            account: null,
            trigger: "signIn",
          } as Parameters<typeof jwt>[0]);

          // Step 2: Pass token through session callback
          const initialSession = {
            user: {
              id: "",
              name: userProfile.name,
              email: userProfile.email,
              image: userProfile.image,
            },
            expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          };

          const sessionResult = session({
            session: initialSession,
            token: tokenResult as Record<string, unknown>,
          } as Parameters<typeof session>[0]) as { user: { id: string; name?: string | null; email?: string | null; image?: string | null } };

          // Assert: session contains the same user data
          expect(sessionResult.user.id).toBe(userProfile.id);
          expect(sessionResult.user.name).toBe(userProfile.name);
          expect(sessionResult.user.email).toBe(userProfile.email);
          expect(sessionResult.user.image).toBe(userProfile.image);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Feature: auth-system, Property 2: Unauthenticated requests to protected routes are denied", () => {
  /**
   * **Validates: Requirements 2.4, 3.1, 3.6**
   *
   * For any URL path string that starts with "/dashboard", when the
   * `authorized` callback receives a request with `auth` equal to null
   * or with `auth.user` undefined, the callback SHALL return false.
   */
  it("should deny unauthenticated requests to /dashboard paths", () => {
    const dashboardPathSuffix = fc.oneof(
      fc.constant(""),
      fc.string().map((s) => "/" + s.replace(/[^a-zA-Z0-9/_-]/g, "")),
    );

    fc.assert(
      fc.property(
        dashboardPathSuffix,
        fc.oneof(fc.constant(null), fc.constant(undefined)),
        (suffix, authValue) => {
          const pathname = "/dashboard" + suffix;

          const result = authorized({
            auth: authValue as Parameters<typeof authorized>[0]["auth"],
            request: {
              nextUrl: new URL(`http://localhost${pathname}`),
            },
          } as Parameters<typeof authorized>[0]);

          expect(result).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should deny requests where auth.user is undefined", () => {
    const dashboardPathSuffix = fc.oneof(
      fc.constant(""),
      fc.string().map((s) => "/" + s.replace(/[^a-zA-Z0-9/_-]/g, "")),
    );

    fc.assert(
      fc.property(dashboardPathSuffix, (suffix) => {
        const pathname = "/dashboard" + suffix;

        const result = authorized({
          auth: { user: undefined } as Parameters<typeof authorized>[0]["auth"],
          request: {
            nextUrl: new URL(`http://localhost${pathname}`),
          },
        } as Parameters<typeof authorized>[0]);

        expect(result).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});

describe("Feature: auth-system, Property 3: Authenticated requests to protected routes are allowed", () => {
  /**
   * **Validates: Requirements 2.3, 3.2**
   *
   * For any URL path string that starts with "/dashboard", when the
   * `authorized` callback receives a request with a valid `auth` object
   * containing a non-null user, the callback SHALL return true.
   */
  it("should allow authenticated requests to /dashboard paths", () => {
    const dashboardPathSuffix = fc.oneof(
      fc.constant(""),
      fc.string().map((s) => "/" + s.replace(/[^a-zA-Z0-9/_-]/g, "")),
    );

    const validUser = fc.record({
      id: fc.string({ minLength: 1 }),
      name: fc.string({ minLength: 1 }),
      email: fc.emailAddress(),
      image: fc.oneof(fc.webUrl(), fc.constant(null)),
    });

    fc.assert(
      fc.property(dashboardPathSuffix, validUser, (suffix, user) => {
        const pathname = "/dashboard" + suffix;

        const result = authorized({
          auth: { user } as Parameters<typeof authorized>[0]["auth"],
          request: {
            nextUrl: new URL(`http://localhost${pathname}`),
          },
        } as Parameters<typeof authorized>[0]);

        expect(result).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
