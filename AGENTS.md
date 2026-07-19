<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Wanna Dimsum POS

Internal point-of-sale system. This app is a faithful port of four self-contained HTML mockups in `docs/` (`Wanna Dimsum Owner.dc.html`, `Kasir`, `Kitchen`, `Inventory`). The mockups are the visual source of truth.

## Stack
- Next.js 16 (App Router, Turbopack), React 19, TypeScript strict.
- Tailwind v4 — CSS-based config via `@theme` in `src/app/globals.css` (no `tailwind.config.js`).
- shadcn/ui (radix-nova) in `src/components/ui/`, lucide-react for icons.
- Drizzle ORM + better-sqlite3 (`src/db/`). Frontend is still mock-driven; DB layer is set up, migrated, and seeded.
- Auth: better-auth (`src/lib/auth.ts`, client `src/lib/auth-client.ts`, handler `src/app/api/auth/[...all]/route.ts`). The `users` table is **canonical** — better-auth is remapped onto it via the drizzle adapter (`user: schema.users`), so the 8 existing FKs to `users.id` stay intact; `session`/`account`/`verification` are added alongside. RBAC stays hand-rolled (`roles`/`permissions`/`rolePermissions`/`userOutlets`), enforced server-side off `users.roleId` — the admin plugin's string-role storage is **not** used, and never create a parallel `user` table. Secrets in `.env` (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`), never committed; `.env.example` is the template.

## Conventions
- Fonts: Plus Jakarta Sans (`--font-sans`) + JetBrains Mono (`--font-mono`), applied in `layout.tsx`. Monospace numbers via `.font-mono` or inline `var(--font-mono)`.
- Design tokens: `src/lib/tokens.ts` (`tokens`, `tones`). Brand primary `#A91F34`, canvas `#FFF9F2`, Owner suite bg `#F5F6F8`.
- Money is integer rupiah; format with `formatRupiah` from `src/lib/format.ts`.
- Shared animations (`wd-blink`, `wd-pop`, `wd-slideup`, `wd-fade`, `wd-fade-up`, `wd-flash`, `wd-grow`) and `.wd-scroll` scrollbar live in `globals.css`.
- Screens are `"use client"` and use inline styles for pixel fidelity with the mockups.

## Routes
`/` role launcher · `/owner` (state-routed Business Suite shell) · `/kasir` · `/kitchen` · `/inventory` · `/api/auth/*` (better-auth handler). Login/PIN/logout + `/manager` land in Phase 2.

## Scripts
`npm run dev` · `npm run build` · `npm run typecheck` · `npm run lint` · `npm test` (Vitest; `test:watch` for watch mode) · `npm run db:generate` · `npm run db:push` · `npm run db:seed` (5 roles + one user per role; dev credentials printed on run).

Env is validated by a typed, fail-fast loader `src/lib/env.ts` (`DATABASE_URL`, `BETTER_AUTH_SECRET` ≥32 chars, `BETTER_AUTH_URL`) — imported by `src/db/index.ts` and `src/lib/auth.ts`; it throws with a clear message on first access if misconfigured. Node scripts that import the DB (e.g. `db:seed`) load `.env` via `--env-file`; Next auto-loads it for dev/build.

## Cross-cutting server layers
- **Auth/session**: authoritative checks in `src/lib/session.ts` (`getAppSession`/`requireSession`/`requireRoute`) — always server-side, re-validated against the DB. `src/proxy.ts` only does a cheap cookie-existence redirect; never trust it for identity.
- **Outlet scope (BR-010)**: `src/lib/outlet-scope.ts` — `canAccessOutlet`/`assertOutletAccess`/`scopedOutletIds` (pure, tested). Call these before any outlet-scoped query; a client `outletId` is untrusted. Owner is not special-cased — scope is data-driven via `userOutlets`.
- **Audit (§8.10)**: `src/lib/audit.ts` `writeAudit` is the single choke point for `audit_logs` — best-effort, never throws. Login/PIN events already wired via `databaseHooks.session.create.after` in `auth.ts`; add refund/void/discount/adjustment/role actions there as those features land.

## Implementation phases
Work is decomposed into self-contained phase files under [`docs/phases/`](docs/phases/README.md) — each maps to PRD §23 with scope, dependencies, acceptance criteria, and a local Definition of Done. **Coding agents: read the assigned phase file (and this AGENTS.md) before writing code; don't start a phase until its dependencies are done.** `docs/PRD.md` is the functional source of truth, the four `docs/*.dc.html` mockups the visual one, and `src/db/schema.ts` the data one.
