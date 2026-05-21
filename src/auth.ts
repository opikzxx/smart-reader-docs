import NextAuth from "next-auth";
import { D1Adapter } from "@auth/d1-adapter";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const { env } = getCloudflareContext();
  return {
    ...authConfig,
    adapter: D1Adapter(env.DB),
  };
});
