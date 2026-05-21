# Requirements Document

## Introduction

This document defines the requirements for the authentication system of the Smart Document Reader application. The system provides user authentication via OAuth providers (Google and GitHub) using NextAuth.js v5 (Auth.js) with JWT session strategy, optimized for Cloudflare Workers Edge Runtime. The authentication foundation enables secure access to protected application routes and provides a clean, minimalist user experience for sign-in and session management.

## Glossary

- **Auth_System**: The NextAuth.js v5 authentication module responsible for managing OAuth sign-in flows, JWT session creation, and session validation
- **Edge_Middleware**: The Next.js middleware running on Cloudflare Workers Edge Runtime that intercepts requests to protected routes and enforces authentication
- **D1_Database**: The Cloudflare D1 SQL database storing user accounts, OAuth provider links, and verification tokens
- **D1_Adapter**: The @auth/d1-adapter module that connects NextAuth.js to the Cloudflare D1 database for persisting user and account data
- **Login_Page**: The client-facing page at `/login` that presents OAuth sign-in options to unauthenticated users
- **Dashboard_Page**: The protected page at `/dashboard` that displays user-specific content after successful authentication
- **Auth_Config**: The edge-safe authentication configuration file (`auth.config.ts`) containing provider definitions and JWT settings without database dependencies
- **Auth_Module**: The full authentication configuration file (`auth.ts`) that extends Auth_Config with the D1_Adapter for database persistence
- **Query_Provider**: The TanStack React Query provider component that wraps the application for client-side state management
- **OAuth_Provider**: An external identity provider (Google or GitHub) used to authenticate users via the OAuth 2.0 protocol
- **JWT_Token**: A JSON Web Token used as the session strategy for stateless, Edge-compatible session verification without database queries per request
- **Protected_Route**: Any route under `/dashboard` that requires an authenticated session to access

## Requirements

### Requirement 1: OAuth Provider Authentication

**User Story:** As a user, I want to sign in using my existing Google or GitHub account, so that I can access the Smart Document Reader without creating a separate username and password.

#### Acceptance Criteria

1. WHEN a user clicks the "Sign in with Google" button on the Login_Page, THE Auth_System SHALL initiate the Google OAuth 2.0 authorization flow
2. WHEN a user clicks the "Sign in with GitHub" button on the Login_Page, THE Auth_System SHALL initiate the GitHub OAuth 2.0 authorization flow
3. WHEN an OAuth_Provider returns a successful authorization response, THE Auth_System SHALL create a JWT_Token containing the user session data and redirect the user to the Dashboard_Page at `/dashboard`
4. WHEN an OAuth_Provider returns an error response, THE Auth_System SHALL redirect the user to the Login_Page with an error indication via URL query parameter
5. WHEN a new user authenticates via an OAuth_Provider for the first time, THE D1_Adapter SHALL persist the user record and linked account in the D1_Database
6. WHEN a returning user authenticates via an OAuth_Provider, THE D1_Adapter SHALL retrieve the existing user record and issue a new JWT_Token without creating a duplicate user entry
7. IF the D1_Adapter fails to persist a new user record due to a database error, THEN THE Auth_System SHALL redirect the user to the Login_Page with an error indication

### Requirement 2: JWT Session Management

**User Story:** As a system operator, I want sessions managed via JWT tokens, so that session verification occurs at the Edge without database query overhead per request.

#### Acceptance Criteria

1. THE Auth_System SHALL use the JWT session strategy for all session management
2. WHEN a user successfully authenticates, THE Auth_System SHALL issue a JWT_Token containing the user identifier, name, email, and profile image
3. WHEN a JWT_Token is presented with a valid signature and unexpired timestamp, THE Auth_System SHALL consider the session authenticated without querying the D1_Database
4. WHEN a JWT_Token has an invalid signature or expired timestamp, THE Auth_System SHALL reject the session as unauthenticated and require the user to re-authenticate
5. THE Auth_System SHALL sign JWT tokens using the AUTH_SECRET environment variable
6. THE Auth_System SHALL issue JWT_Tokens with a maximum lifetime of 30 days, after which the token SHALL be considered expired regardless of other validity checks
7. IF the AUTH_SECRET environment variable is not configured or is empty, THEN THE Auth_System SHALL fail to start and SHALL not issue or validate any JWT_Tokens

### Requirement 3: Edge Middleware Route Protection

**User Story:** As a system operator, I want unauthenticated users redirected away from protected routes, so that application data remains secure.

#### Acceptance Criteria

1. WHEN an unauthenticated request targets any path with the prefix `/dashboard` (including `/dashboard` itself and any sub-paths such as `/dashboard/settings`), THE Edge_Middleware SHALL respond with an HTTP 302 redirect to the Login_Page at `/login`
2. WHEN an authenticated request targets any path with the prefix `/dashboard`, THE Edge_Middleware SHALL allow the request to proceed to the target route without modification
3. THE Edge_Middleware SHALL validate sessions using only the Auth_Config (edge-safe configuration without D1_Database dependencies)
4. WHEN the Edge_Middleware processes a request, THE Edge_Middleware SHALL complete validation without invoking any Node.js-only APIs
5. THE Edge_Middleware SHALL NOT intercept requests to static asset paths (paths prefixed with `/_next/static`, `/_next/image`, or `/favicon`) regardless of authentication status
6. IF session validation fails due to a malformed or unverifiable JWT_Token, THEN THE Edge_Middleware SHALL treat the request as unauthenticated and redirect to the Login_Page at `/login` with an HTTP 302 response

### Requirement 4: Split Authentication Configuration

**User Story:** As a developer, I want the authentication configuration split into edge-safe and full modules, so that middleware runs without database dependencies while server routes retain full adapter functionality.

#### Acceptance Criteria

1. THE Auth_Config SHALL define OAuth_Provider configurations for Google and GitHub without importing the D1_Adapter
2. THE Auth_Config SHALL specify the JWT session strategy and define the `authorized`, `jwt`, and `session` callbacks required for Edge-based session validation
3. THE Auth_Module SHALL extend the Auth_Config with the D1_Adapter for database persistence of users and accounts, receiving the D1_Database binding from the Cloudflare Workers environment at runtime
4. THE Auth_Config SHALL contain only Edge Runtime compatible code with no Node.js-only API usage
5. THE Auth_Module SHALL export the authentication handlers (`GET` and `POST`) for the NextAuth API route
6. THE Auth_Config SHALL export a configuration object that the Edge_Middleware can import to perform session validation without triggering D1_Adapter module resolution

### Requirement 5: D1 Database Schema for Authentication

**User Story:** As a developer, I want a D1 database schema that stores user accounts and OAuth links, so that NextAuth.js can persist authentication data.

#### Acceptance Criteria

1. THE D1_Database SHALL contain a `users` table with columns: id (TEXT, primary key), name (TEXT, nullable), email (TEXT, nullable), emailVerified (TEXT, nullable), and image (TEXT, nullable)
2. THE D1_Database SHALL contain an `accounts` table with columns: userId (TEXT, NOT NULL), type (TEXT, NOT NULL), provider (TEXT, NOT NULL), providerAccountId (TEXT, NOT NULL), refresh_token (TEXT, nullable), access_token (TEXT, nullable), expires_at (INTEGER, nullable), token_type (TEXT, nullable), scope (TEXT, nullable), id_token (TEXT, nullable), and session_state (TEXT, nullable)
3. THE D1_Database SHALL contain a `verification_tokens` table with columns: identifier (TEXT, NOT NULL), token (TEXT, NOT NULL), and expires (TEXT, NOT NULL)
4. THE D1_Database SHALL enforce a unique constraint on the accounts table for the combination of provider and providerAccountId
5. THE D1_Database SHALL enforce a unique constraint on the verification_tokens table for the combination of identifier and token
6. THE D1_Database SHALL define a foreign key on the accounts table referencing the users table via the userId column, with CASCADE delete behavior
7. THE D1_Database SHALL define the `users` table `id` column as the primary key, and the `accounts` table primary key as the combination of provider and providerAccountId

### Requirement 6: Login Page User Interface

**User Story:** As a user, I want a clean and intuitive login page, so that I can quickly identify and use my preferred sign-in method.

#### Acceptance Criteria

1. THE Login_Page SHALL display a centered card component containing a heading with the text "Sign in", the OAuth sign-in buttons, and a subtle light background (slate-50 or zinc-50)
2. THE Login_Page SHALL display a "Sign in with Google" button with the official Google icon, visually distinct and labeled with the text "Sign in with Google"
3. THE Login_Page SHALL display a "Sign in with GitHub" button with the official GitHub icon, visually distinct and labeled with the text "Sign in with GitHub"
4. IF a user is already authenticated WHEN the user navigates to the Login_Page, THEN THE Login_Page SHALL redirect the user to the Dashboard_Page at `/dashboard`
5. THE Login_Page SHALL render without requiring any Node.js-only APIs (Edge Runtime compatible)
6. IF the Login_Page receives an authentication error via URL query parameter, THEN THE Login_Page SHALL display an error message indicating the sign-in attempt was unsuccessful
7. THE Login_Page SHALL display the OAuth sign-in buttons in a vertically stacked layout with the Google button appearing above the GitHub button

### Requirement 7: Dashboard Page User Interface

**User Story:** As an authenticated user, I want a personalized dashboard with my profile information, so that I can confirm my identity and sign out when needed.

#### Acceptance Criteria

1. THE Dashboard_Page SHALL display a top navigation bar containing the application logo, the authenticated user name (truncated to a maximum of 50 characters), the user profile photo from the OAuth_Provider displayed as a circular image, and a "Sign Out" button
2. THE Dashboard_Page SHALL display a welcome message in the format "Welcome back, [User Name]" where [User Name] is the authenticated user's display name
3. WHEN a user clicks the "Sign Out" button, THE Auth_System SHALL clear the session cookie and redirect the user to the Login_Page within 2 seconds
4. THE Dashboard_Page SHALL be accessible only to authenticated users (enforced by Edge_Middleware)
5. IF the OAuth_Provider does not supply a profile photo for the authenticated user, THEN THE Dashboard_Page SHALL display a fallback avatar placeholder in place of the profile photo
6. IF the authenticated user's display name is unavailable, THEN THE Dashboard_Page SHALL display the user's email address in place of the display name in both the navigation bar and the welcome message

### Requirement 8: TanStack Query Provider Integration

**User Story:** As a developer, I want TanStack React Query configured at the application root, so that client components can use React Query for data fetching and state management.

#### Acceptance Criteria

1. THE Query_Provider SHALL wrap the application component tree in the root layout (`app/layout.tsx`)
2. THE Query_Provider SHALL be implemented as a client component (using the `"use client"` directive) in a separate file from the server-rendered root layout
3. THE Query_Provider SHALL instantiate a QueryClient with a staleTime of at least 60 seconds and a maximum retry count of no more than 3 for failed queries
4. THE Query_Provider SHALL maintain a stable QueryClient instance across re-renders by using a React state initializer or ref, preventing the client from being recreated on each render

### Requirement 9: Cloudflare Workers Compatibility

**User Story:** As a system operator, I want the entire authentication system to run on Cloudflare Workers, so that the application deploys and operates correctly on the Edge.

#### Acceptance Criteria

1. THE Auth_System SHALL operate without using any Node.js-only APIs (such as `fs`, `crypto` from Node, `child_process`, or `net`)
2. THE Auth_System SHALL execute without runtime errors when deployed to Cloudflare Workers with the `nodejs_compat` compatibility flag enabled in the Cloudflare Workers configuration
3. THE D1_Adapter SHALL access the D1_Database through the Cloudflare Workers binding interface provided by the opennextjs-cloudflare runtime context
4. WHEN the application is built with opennextjs-cloudflare, THE Auth_System SHALL produce no Edge Runtime compatibility errors during the build process
5. IF the D1_Database binding is unavailable at runtime, THEN THE Auth_System SHALL return an error indication to the caller rather than crashing the Worker
6. WHEN the application is deployed to Cloudflare Workers, THE Auth_System SHALL complete OAuth sign-in and session validation flows without runtime errors
