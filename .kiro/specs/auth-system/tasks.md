# Implementation Plan: Auth System

## Overview

Implement a complete authentication system for the Smart Document Reader using NextAuth.js v5 with Google and GitHub OAuth providers, JWT session strategy, and Cloudflare D1 for user persistence. The implementation follows a split-config pattern for Edge middleware compatibility and uses server components for protected pages.

## Tasks

- [x] 1. Set up D1 database schema and Cloudflare bindings
  - [x] 1.1 Create D1 migration SQL file
    - Create `src/lib/db/schema.sql` with the users, accounts, and verification_tokens tables
    - Include all constraints: primary keys, foreign keys with CASCADE delete, unique constraints
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 1.2 Update wrangler.jsonc with D1 binding
    - Add `d1_databases` configuration with binding name "DB" and database name "superbrands-auth"
    - Add placeholder for database_id (to be filled after `wrangler d1 create`)
    - _Requirements: 9.3_

  - [x] 1.3 Update Cloudflare environment type definitions
    - Run `cf-typegen` or manually add the DB binding type to `cloudflare-env.d.ts`
    - Ensure TypeScript recognizes `env.DB` as a D1Database binding
    - _Requirements: 9.3, 4.3_

- [x] 2. Implement core authentication configuration
  - [x] 2.1 Create edge-safe auth config (`src/auth.config.ts`)
    - Define `authConfig` with Google and GitHub providers
    - Set JWT session strategy with 30-day maxAge
    - Implement `authorized` callback for route protection logic
    - Implement `jwt` callback to persist user.id into token
    - Implement `session` callback to expose token.id in session.user
    - Set custom signIn page to `/login`
    - _Requirements: 4.1, 4.2, 4.4, 4.6, 2.1, 2.6, 3.1, 3.2_

  - [x] 2.2 Create full auth module (`src/auth.ts`)
    - Import and extend `authConfig` with D1Adapter
    - Use `getCloudflareContext()` to access `env.DB` at runtime
    - Export `handlers`, `auth`, `signIn`, `signOut`
    - Use the functional NextAuth config pattern (callback returning config)
    - _Requirements: 4.3, 4.5, 1.5, 1.6, 9.3_

  - [x] 2.3 Create NextAuth API route handler (`src/app/api/auth/[...nextauth]/route.ts`)
    - Import and re-export `GET` and `POST` handlers from `@/auth`
    - _Requirements: 4.5_

  - [x] 2.4 Create Edge middleware (`src/middleware.ts`)
    - Import `authConfig` (not `auth.ts`) to avoid D1 dependency in middleware
    - Configure matcher to exclude static assets (`/_next/static`, `/_next/image`, `/favicon`)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 2.5 Write property tests for auth callbacks
    - **Property 1: Session data round-trip preservation**
    - **Property 2: Unauthenticated requests to protected routes are denied**
    - **Property 3: Authenticated requests to protected routes are allowed**
    - **Validates: Requirements 1.3, 2.2, 2.3, 2.4, 3.1, 3.2, 3.6**

  - [x] 2.6 Write property test for middleware matcher
    - **Property 4: Static asset paths are excluded from middleware interception**
    - **Validates: Requirements 3.5**

- [x] 3. Checkpoint - Ensure auth configuration compiles
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement UI components and providers
  - [x] 4.1 Create QueryProvider component (`src/components/providers/query-provider.tsx`)
    - Implement as client component with `"use client"` directive
    - Instantiate QueryClient with staleTime of 60 seconds and retry count of 3
    - Use `useState` initializer for stable QueryClient instance across re-renders
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 4.2 Update root layout (`src/app/layout.tsx`)
    - Wrap children with QueryProvider
    - Update metadata title/description for Smart Document Reader
    - _Requirements: 8.1_

  - [x] 4.3 Create SignInButton component (`src/components/auth/sign-in-button.tsx`)
    - Implement as client component with OAuth provider parameter
    - Display provider icon (Google/GitHub from lucide-react) and label text
    - Call `signIn(provider)` from next-auth/react on click
    - _Requirements: 6.2, 6.3, 1.1, 1.2_

  - [x] 4.4 Create SignOutButton component (`src/components/auth/sign-out-button.tsx`)
    - Implement as client component
    - Call `signOut({ redirectTo: "/login" })` on click
    - _Requirements: 7.3_

  - [x] 4.5 Create Avatar component (`src/components/ui/avatar.tsx`)
    - Display circular profile image when available
    - Show fallback placeholder (initials or generic icon) when image is null
    - _Requirements: 7.1, 7.5_

- [x] 5. Implement pages
  - [x] 5.1 Create Login page (`src/app/login/page.tsx`)
    - Render centered card with "Sign in" heading
    - Display Google and GitHub sign-in buttons in vertical stack (Google above GitHub)
    - Check for existing session and redirect to `/dashboard` if authenticated
    - Read `error` query parameter and display generic error banner when present
    - Use subtle light background (slate-50)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 1.4, 1.7_

  - [x] 5.2 Create Dashboard layout (`src/app/dashboard/layout.tsx`)
    - Fetch session via server-side `auth()` call
    - Render top navigation bar with app logo, user name (truncated to 50 chars), avatar, and sign-out button
    - Apply name fallback to email when name is null/undefined
    - _Requirements: 7.1, 7.4, 7.5, 7.6_

  - [x] 5.3 Create Dashboard page (`src/app/dashboard/page.tsx`)
    - Display welcome message in format "Welcome back, [User Name]"
    - Use email as fallback when name is unavailable
    - _Requirements: 7.2, 7.6_

  - [x] 5.4 Write property test for name truncation
    - **Property 5: User display name truncation**
    - **Validates: Requirements 7.1**

  - [x] 5.5 Write property test for name fallback
    - **Property 6: Name fallback to email**
    - **Validates: Requirements 7.6**

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Integration wiring and environment setup
  - [x] 7.1 Configure environment variables
    - Add AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_GITHUB_ID, AUTH_GITHUB_SECRET to `.dev.vars`
    - Document required environment variables in a comment block
    - _Requirements: 2.5, 2.7, 9.1, 9.2_

  - [x] 7.2 Verify build compatibility
    - Ensure `opennextjs-cloudflare build` completes without Edge Runtime errors
    - Verify middleware only imports from `auth.config.ts` (no D1 dependency in Edge bundle)
    - _Requirements: 9.1, 9.2, 9.4, 9.5, 9.6_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The D1 database must be created via `wrangler d1 create superbrands-auth` before running migrations
- The `database_id` in wrangler.jsonc must be updated after D1 creation
- AUTH_SECRET can be generated with `openssl rand -base64 32`
- OAuth credentials must be configured in Google Cloud Console and GitHub Developer Settings

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "4.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "4.2", "4.3", "4.4", "4.5"] },
    { "id": 3, "tasks": ["2.5", "2.6", "5.1", "5.2"] },
    { "id": 4, "tasks": ["5.3", "5.4", "5.5"] },
    { "id": 5, "tasks": ["7.1"] },
    { "id": 6, "tasks": ["7.2"] }
  ]
}
```
