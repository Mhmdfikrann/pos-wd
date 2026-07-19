/**
 * better-auth catch-all route handler.
 *
 * Mounts every better-auth endpoint (sign-in, sign-up, sign-out, session, the
 * username plugin routes, etc.) under /api/auth/*. See src/lib/auth.ts.
 */
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { POST, GET } = toNextJsHandler(auth);
