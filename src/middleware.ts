import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth?.user;
  const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
  const isOnLogin = nextUrl.pathname.startsWith("/login");

  // Redirect unauthenticated users to login
  if (isOnDashboard && !isLoggedIn) {
    return Response.redirect(new URL("/login", nextUrl));
  }

  // Redirect authenticated users away from login page
  if (isOnLogin && isLoggedIn) {
    return Response.redirect(new URL("/dashboard", nextUrl));
  }
});

export const runtime = "experimental-edge";

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon).*)"],
};
