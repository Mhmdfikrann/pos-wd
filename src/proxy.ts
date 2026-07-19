/**
 * Request proxy (Next 16's rename of middleware) — CHEAP cookie-existence
 * redirect only (PRD §8.1).
 *
 * getSessionCookie() checks a session cookie is present; it does NOT validate
 * the session. The authoritative role/identity check runs server-side in each
 * shell via requireRoute()/getAppSession() (src/lib/session.ts). This layer
 * only spares unauthenticated users a server round-trip before /login.
 *
 * We deliberately do NOT read the DB or trust any role here — per the Next 16
 * proxy docs, this is an optimistic check, not a session/authorization solution.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/** Route prefixes that require a session. Everything else is public. */
const PROTECTED = ["/owner", "/manager", "/kasir", "/kitchen", "/inventory"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const needsAuth = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!needsAuth) return NextResponse.next();

  const hasCookie = getSessionCookie(request);
  if (hasCookie) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Run on the protected shells only; skip static assets and the auth API.
  matcher: ["/owner/:path*", "/manager/:path*", "/kasir/:path*", "/kitchen/:path*", "/inventory/:path*"],
};
