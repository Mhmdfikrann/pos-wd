/**
 * Browser-side better-auth client for Wanna Dimsum POS.
 *
 * Mirrors the server plugins in src/lib/auth.ts — the username() server plugin
 * needs usernameClient() here so `authClient.signIn.username(...)` is typed and
 * routed correctly. Use this from "use client" components only.
 */
"use client";

import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  // Same-origin in the browser; BETTER_AUTH_URL covers the server side.
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  plugins: [usernameClient()],
});

export const { signIn, signOut, signUp, useSession } = authClient;
