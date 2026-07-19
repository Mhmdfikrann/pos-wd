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
 * - Username login (username() plugin) suits cashier logins. PIN fast-login is
 *   a separate custom plugin (pinPlugin, src/lib/pin-plugin.ts) wired below.
 * - nextCookies() MUST be last so server actions forward Set-Cookie correctly.
 *
 * Password/PIN are hashed (NFR 13.3). Secrets come from env, never the repo.
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "@/db";
import { pinPlugin } from "@/lib/pin-plugin";
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
  // about them but must not let clients set them (input:false) or leak the PIN.
  user: {
    additionalFields: {
      roleId: { type: "string", input: false },
      pinHash: { type: "string", required: false, input: false, returned: false },
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
        // Fires for BOTH password login and the custom PIN endpoint (both mint
        // a session via internalAdapter.createSession) — the single capture
        // point for the login audit event (§8.10, FR-001). Best-effort: never
        // block the login if the audit insert fails.
        after: async (session, context) => {
          const isPin = context?.path?.includes("/sign-in/pin");
          await writeAudit({
            action: isPin ? "auth.login_pin" : "auth.login",
            actorId: session.userId,
            detail: { ip: session.ipAddress ?? null, ua: session.userAgent ?? null },
          });
        },
      },
    },
  },
  plugins: [
    username(),
    pinPlugin(), // custom /sign-in/pin endpoint (cashier fast-login)
    nextCookies(), // keep LAST
  ],
});

export type Session = typeof auth.$Infer.Session;
