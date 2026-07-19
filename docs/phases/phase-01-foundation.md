# Phase 1 — Foundation

> **Status:** complete (2026-07-19) · **Depends on:** [Phase 0](./phase-00-decisions.md) · **Unblocks:** all feature phases
> **PRD:** §23 (Phase 1), §13 (NFRs), §17.2 (design tokens)

Read [AGENTS.md](../../AGENTS.md) first. **This is not the Next.js you know** — consult `node_modules/next/dist/docs/` before writing framework code.

## Goal

A running project with the design system, DB connection, env validation, and a test harness — the floor every feature stands on.

## Already in place (verified)

- Next.js 16 (App Router, Turbopack), React 19, TS strict — `package.json`, `tsconfig.json`.
- Tailwind v4 via `@theme` in `src/app/globals.css` (no `tailwind.config.js`).
- Design tokens `src/lib/tokens.ts` (`tokens`, `tones`), fonts wired in `layout.tsx`.
- `formatRupiah` in `src/lib/format.ts`.
- Drizzle + better-sqlite3 connection `src/db/index.ts` (WAL on, FKs on), schema `src/db/schema.ts`.
- shadcn/ui primitives in `src/components/ui/`, lucide-react icons.
- The four mockup ports: `/kasir`, `/kitchen`, `/inventory`, `/owner` (mock-data-driven).

## Work completed (2026-07-19)

1. **Env validation** — `src/lib/env.ts`: dependency-free typed loader validating `DATABASE_URL`, `BETTER_AUTH_SECRET` (≥32 chars), `BETTER_AUTH_URL` (absolute URL). Lazy proxy — validates on first property access (fail-fast at runtime) so tooling can import it without a live `.env`. Wired into `src/db/index.ts` (DB path) and `src/lib/auth.ts` (secret + baseURL passed explicitly). Clear Indonesian error listing every bad key. `.env*` gitignored (confirmed).
2. **Migrations** — first migration `drizzle/0000_flaky_blonde_phantom.sql` generated (28 tables incl. better-auth). *Untracked — stage/commit per git workflow.*
3. **`serverExternalPackages: ['better-sqlite3']`** — present in `next.config.ts`.
4. **Test harness** — Vitest 4 (`vitest.config.ts`, node env, dependency-free `@/` alias). Scripts `test` (run) + `test:watch`. Smoke tests: `src/lib/format.test.ts` (money/number/mmss/clock) + `src/lib/env.test.ts` (loader defaults + fail-fast). 14 tests passing.
5. **`data/` directory** — exists at `./data/pos.db`; `/data`, `*.db*` gitignored (confirmed).

> Node scripts (`db:seed`) don't auto-load `.env` like Next does, so `db:seed` runs via `tsx --env-file=.env`. `drizzle-kit` reads `process.env` directly with a fallback in `drizzle.config.ts`, so it needs no change.

## Acceptance criteria

- [x] `npm run typecheck` clean.
- [x] `npm run build` succeeds.
- [x] `npm run lint` clean.
- [x] `npm test` runs passing tests (14 passing).
- [x] Missing required env var fails with a clear message (verified: accessing `env` without `BETTER_AUTH_SECRET` throws the listing message).
- [x] First migration present under `drizzle/` (commit pending git workflow).

## Definition of Done

PRD §24 gate: typecheck + lint + build + tests green, migration present, docs updated.
