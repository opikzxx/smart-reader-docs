import { cookies } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { jwtDecrypt } from "jose";

/**
 * Lightweight session helper for API routes in edge runtime.
 * Decodes the NextAuth v5 encrypted JWT session token using jose directly,
 * avoiding bundling issues with next-auth in Cloudflare Workers.
 */
export async function auth() {
  const { env } = getCloudflareContext();
  const secret = env.AUTH_SECRET;

  const cookieStore = await cookies();
  const sessionToken =
    cookieStore.get("__Secure-authjs.session-token")?.value ||
    cookieStore.get("authjs.session-token")?.value;

  if (!sessionToken) return null;

  try {
    const payload = await decryptToken(sessionToken, secret);
    if (!payload) return null;

    return {
      user: {
        id: (payload.id ?? payload.sub) as string | undefined,
        name: payload.name as string | undefined,
        email: payload.email as string | undefined,
        image: payload.picture as string | undefined,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Decrypt a NextAuth v5 JWE token.
 * NextAuth v5 uses "dir" + "A256CBC-HS512" with a key derived via HKDF.
 */
async function decryptToken(
  token: string,
  secret: string
): Promise<Record<string, unknown> | null> {
  try {
    const enc = new TextEncoder();

    // Derive encryption key same way NextAuth does:
    // HKDF with SHA-256, empty salt, info = "Auth.js Generated Encryption Key"
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HKDF" },
      false,
      ["deriveBits"]
    );

    // A256CBC-HS512 needs 64 bytes (512 bits)
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: new Uint8Array(0),
        info: enc.encode("Auth.js Generated Encryption Key"),
      },
      keyMaterial,
      512
    );

    const derivedKey = new Uint8Array(derivedBits);

    const { payload } = await jwtDecrypt(token, derivedKey, {
      clockTolerance: 15,
    });

    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}
