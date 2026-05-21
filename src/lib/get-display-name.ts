/**
 * Resolves the display name for a user session.
 *
 * Fallback logic:
 * 1. Use user.name if available
 * 2. Fall back to user.email if name is null/undefined
 * 3. Fall back to "User" if both are null/undefined
 *
 * The result is truncated to a maximum of 50 characters.
 */

import { truncateName } from "./truncate-name";

export interface UserSession {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export function getDisplayName(user: UserSession | null | undefined): string {
  return truncateName(user?.name ?? user?.email ?? "User");
}
