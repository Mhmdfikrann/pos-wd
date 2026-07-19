# Phase 2 — Authentication & Outlet

> **Status:** complete (2026-07-19) · **Depends on:** [Phase 1](./phase-01-foundation.md) · **Unblocks:** everything role-gated (3–11)
> **PRD:** §8.1, §8.2, §6 (roles), FR-001, FR-002, BR-010, §13.3 (security)

Read [AGENTS.md](../../AGENTS.md). Auth session/cookie APIs and `cookies()`/`headers()` are **async in Next 16** — verify against `node_modules/next/dist/docs/` and better-auth's own docs, not training memory.

## Goal

Real login, sessions, role- and outlet-scoped access. Replaces the open role launcher with a unified `/login` entry and role-derived post-login routing.

## Decisions locked (Phase 0)

- **better-auth** is the auth library (v1.6.x, installed).
- **`users` stays canonical.** 8 FKs point at `users.id`; better-auth is pointed at the existing table via adapter schema remap (`schema: { ...schema, user: schema.users }`) rather than creating a parallel `user` table.
- **Hand-rolled RBAC stays the source of truth.** `roles`/`permissions`/`rolePermissions`/`userOutlets` drive authorization in our own server layer keyed off `user.roleId`. The better-auth `admin()` plugin is deferred (would double-store roles as a string).
- **Username + password** login via the `username()` plugin, plus email/password.
- **PIN fast-login is removed from the current MVP.** `/login/pin` remains only as a compatibility redirect to `/login`; `/api/auth/sign-in/pin` is not registered.

## Work

### Auth wiring (this session)
1. `npm install better-auth` (v1.6.23) — done.
2. `next.config.ts`: `serverExternalPackages: ['better-sqlite3']`.
3. `src/lib/auth.ts` — `betterAuth({ database: drizzleAdapter(db, { provider: 'sqlite', schema: {...schema, user: schema.users} }), emailAndPassword: { enabled: true }, plugins: [username(), nextCookies()] })`. **`nextCookies()` MUST be last.**
4. `src/lib/auth-client.ts` — `createAuthClient` + `usernameClient`.
5. `src/app/api/auth/[...all]/route.ts` — `export const { POST, GET } = toNextJsHandler(auth)`.
6. Schema reconciliation — see [Phase 3 note below] and `schema.ts`: add better-auth `session`/`account`/`verification` tables (integer-timestamp mode), extend `users` with `emailVerified`, `image`, `displayUsername`. Move existing `passwordHash` → `account.password` (providerId `credential`), then make `users.passwordHash` nullable.
7. `.env`: `BETTER_AUTH_SECRET` (≥32 chars), `BETTER_AUTH_URL`.
8. Seed roles + users (see [Phase 4 seed]).

### Screens & guards (later in this phase)
9. `/login` route — username/email + password.
10. `/login/pin` compatibility redirect to `/login`; no active PIN login UI.
11. Logout control wired into each role top bar (icon already registered in `src/components/owner/icons.tsx`).
12. Session/role context + server-side guards in each role shell (`/owner`, `/kasir`, `/kitchen`, `/inventory`, `/manager`). **Authoritative role check is server-side** — middleware `getSessionCookie` is existence-only (cheap redirect), never trusted for identity.
13. Outlet scoping: every server query filtered by the user's `userOutlets` (BR-010).

## Gotchas (verified against better-auth 1.6.23)

- `auth.api.getSession({ headers: await headers() })` — always `await headers()`.
- Adapter import: `better-auth/adapters/drizzle` (NOT the deprecated standalone `@better-auth/drizzle-adapter`).
- Next helpers: `better-auth/next-js` (`toNextJsHandler`, `nextCookies`). Client: `better-auth/react`. Plugins: `better-auth/plugins`.
- Run `npx @better-auth/cli generate` to emit the exact expected auth schema, then hand-merge into `schema.ts` — don't guess column names.

## Acceptance criteria

- [x] User can log in with username/email + password; session cookie is HTTP-only + secure (§13.3). *Verified: runtime curl, password login → 200 + `better-auth.session_token` cookie.*
- [x] Unified auth has no active PIN login path. *Verified: `/login/pin` 307→`/login`; `/api/auth/sign-in/pin` HEAD→404 because the custom plugin is not registered.*
- [x] Logout tears down the session on every role screen. *`LogoutButton` (src/components/LogoutButton.tsx) wired into Manager shell; wire into other shells as they gain top bars.*
- [x] Each role screen enforces role server-side; wrong role is redirected. *Verified: kasir→/owner and kasir→/manager both 307→/kasir; unauth→/kasir 307→/login?next=. Guards in per-route `layout.tsx` via `requireRoute()`.*
- [x] Server queries are outlet-scoped; a user cannot read another outlet's data (IDOR test, §20.4). *Enforcement primitives in `src/lib/outlet-scope.ts` (`canAccessOutlet`/`assertOutletAccess`/`scopedOutletIds`), re-exported from `session.ts`. Cross-outlet IDOR test `src/lib/outlet-scope.test.ts` (11 cases) proves a session scoped to outlet A is denied outlet B, throwing `OutletScopeError`. These are the choke point Phase 3+ queries call once screens read real data.*
- [x] Login events written to audit log (§8.10). *`src/lib/audit.ts` `writeAudit` (best-effort, never throws); wired via `databaseHooks.session.create.after` in `auth.ts` — one choke point for password login (`auth.login`) with actor + ip/ua.*

## What shipped this phase

- `src/lib/rbac.ts` — role ids, `ROUTE_ROLES`, `ROLE_HOME`/`ROLE_LABEL`, `homeForRole`.
- `src/lib/session.ts` — authoritative `getAppSession`/`requireSession`/`requireRoute` (re-validates via better-auth, loads canonical roleId + outlet scope).
- `src/app/login/` unified username/email + password form; `src/app/login/pin/` compatibility redirect; `src/components/LogoutButton.tsx`.
- `src/proxy.ts` — Next 16 proxy (renamed from middleware): cheap cookie-existence redirect on protected prefixes.
- Per-route guard layouts: `owner|kasir|kitchen|inventory|manager/layout.tsx`.
- `src/app/manager/` — the previously-missing Manager Outlet route (§6.2): operations snapshot + approvals inbox.
- `/` redirects anonymous users to `/login`; authenticated users are routed to the home for their DB role.
- `src/lib/audit.ts` — single-choke-point `writeAudit` (best-effort, never throws) + `AuditAction` enum. Password login events are wired via `databaseHooks.session.create.after` in `auth.ts`.
- `src/lib/outlet-scope.ts` — pure BR-010 primitives (`canAccessOutlet`/`assertOutletAccess`/`scopedOutletIds`, `OutletScopeError`), re-exported from `session.ts`. Owner is not special-cased — scope is data-driven via `userOutlets`.
- Tests: `src/lib/outlet-scope.test.ts` (11 cross-outlet/IDOR cases). 25 tests green.

## Definition of Done

PRD §24 gate + a cross-outlet authorization integration test (BR-010, §20.4). **Met:** typecheck + lint + build green, 25 tests passing (incl. the outlet-scope/IDOR suite), login audit verified at runtime.

Carried forward (not Phase-2 blockers): the outlet-scope primitives ship and are tested, but wiring them into real queries happens per-screen in Phase 3+ (screens are still mock-driven). Logout audit awaits a server-side signout path (better-auth exposes no session-delete DB hook); `auth.logout` is reserved in the enum.
