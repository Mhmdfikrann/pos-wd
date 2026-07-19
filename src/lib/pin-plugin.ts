/**
 * Custom better-auth plugin: PIN fast-login for cashiers (PRD §8.1).
 *
 * better-auth has no native PIN auth. This adds a `/sign-in/pin` endpoint that:
 *  1. Looks up an active user by username.
 *  2. Verifies the submitted PIN against `users.pinHash` (scrypt, constant-time
 *     via better-auth's own verifyPassword — never plaintext).
 *  3. On success, mints a real better-auth session + sets the SAME session
 *     cookie as a password login, so the rest of the app treats it identically.
 *
 * PINs are low-entropy, so this is deliberately scoped: username is required
 * (no bare-PIN lookup), and better-auth's global rate limiter covers the route.
 * Tighten to device/outlet scope when the kasir terminal binding lands.
 */
import { createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { verifyPassword } from "better-auth/crypto";
import type { BetterAuthPlugin } from "better-auth";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export const pinPlugin = () =>
  ({
    id: "pin-login",
    endpoints: {
      signInPin: createAuthEndpoint(
        "/sign-in/pin",
        { method: "POST" },
        async (ctx) => {
          const body = (ctx.body ?? {}) as { username?: string; pin?: string };
          const username = body.username?.trim().toLowerCase();
          const pin = body.pin?.trim();

          // Uniform error — never reveal whether the username or the PIN was wrong.
          const fail = () =>
            ctx.json({ error: "PIN atau username salah." }, { status: 401 });

          if (!username || !pin) return fail();

          const user = await db
            .select()
            .from(users)
            .where(eq(users.username, username))
            .get();

          if (!user || !user.active || !user.pinHash) return fail();

          const ok = await verifyPassword({ hash: user.pinHash, password: pin });
          if (!ok) return fail();

          // Mint a real session and set the standard better-auth cookie, exactly
          // as a password sign-in does (see phone-number plugin). PIN sessions
          // are short-lived: pass dontRememberMe = true.
          const session = await ctx.context.internalAdapter.createSession(
            user.id,
            true,
          );
          if (!session) return fail();

          await setSessionCookie(ctx, { session, user }, true);

          return ctx.json({ ok: true });
        },
      ),
    },
  }) satisfies BetterAuthPlugin;
