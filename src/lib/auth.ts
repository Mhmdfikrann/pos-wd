/**
 * better-auth server instance for Wanna Dimsum POS.
 *
 * Design decisions (see docs/phases/phase-02-auth-outlet.md):
 * - The existing `users` table (src/db/schema.ts) is CANONICAL. better-auth is
 *   pointed at it via the drizzle adapter's `schema` remap (`user: users`), so
 *   the 8 existing foreign keys to users.id keep working — we do NOT create a
 *   parallel `user` table.
 * - RBAC stays hand-rolled: roles / permissions / rolePermissions / userOutlets
 *   remain the source of truth. We do NOT use the admin() plugin's string-role
 *   storage. Authorization is enforced server-side keyed off users.roleId.
 * - Username login (username() plugin) supports the unified login screen.
 * - nextCookies() MUST be last so server actions forward Set-Cookie correctly.
 *
 * Passwords are hashed (NFR 13.3). Secrets come from env, never the repo.
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "@/db";
import { env } from "@/lib/env";
import { writeAudit } from "@/lib/audit";

export const auth = betterAuth({
  // Explicit so a missing/short secret fails fast via env validation (§13.3)
  // rather than better-auth silently falling back to an insecure default.
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "sqlite",
    // Remap better-auth's expected singular names onto our tables.
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  // Extra columns living on our canonical users table. better-auth must know
  // about them but must not let clients set them (input:false).
  user: {
    additionalFields: {
      roleId: { type: "string", input: false },
      active: { type: "boolean", defaultValue: true, input: false },
    },
  },
  session: {
    // Short-lived signed cookie cache to avoid a DB hit on every request.
    cookieCache: { enabled: true, maxAge: 300 },
  },
  databaseHooks: {
    session: {
      create: {
        // Single capture point for the login audit event (§8.10, FR-001).
        // Best-effort: never block the login if the audit insert fails.
        after: async (session, context) => {
          await writeAudit({
            action: "auth.login",
            actorId: session.userId,
            detail: {
              path: context?.path ?? null,
              ip: session.ipAddress ?? null,
              ua: session.userAgent ?? null,
            },
          });
        },
      },
    },
  },
  plugins: [
    username(),
    nextCookies(), // keep LAST
  ],
});

export type Session = typeof auth.$Infer.Session;
