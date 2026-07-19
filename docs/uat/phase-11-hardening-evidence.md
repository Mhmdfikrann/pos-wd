# Phase 11 Hardening Evidence

Date: 2026-07-19

## Automated Gates

- `npm test -- --run`: 15 test files, 117 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- Backup script smoke test: `db:backup` -> `db:backup:verify` -> `db:restore` against a temp SQLite DB, integrity `ok`, restored row total matched source.
- Cross-outlet / IDOR: covered by `src/lib/outlet-scope.test.ts`, `src/lib/kitchen-data.test.ts`, `src/lib/finance-data.test.ts`, `src/lib/reports-data.test.ts`.
- Idempotency / rollback: covered by `src/lib/order-core.test.ts`, `src/lib/inventory-data.test.ts`, and `src/lib/backup.test.ts`.
- Backup / restore: covered by `src/lib/backup.test.ts` plus scripts `db:backup`, `db:backup:verify`, `db:restore`.
- Security quick scan:
  - Secret grep found only `.env.example`.
  - No `dangerouslySetInnerHTML`, `eval`, or `new Function` in app code.
  - Server actions/routes checked for `requirePermission`, `requireRoute`, `scopedOutletIds`, or `assertOutletAccess`.
  - `npm audit --audit-level=high` exits 0. Moderate advisories remain in upstream toolchain (`next`/`postcss`, `drizzle-kit`/`esbuild`) with no safe non-breaking fix from `npm audit`.

## Performance Budgets

- POS route target: < 3s.
- Checkout target: < 2s.
- Kitchen ticket target: < 3s.
- Daily report target: < 5s.

Current automated performance coverage:

- Daily report aggregation has a 500-order local volume test under 5s.
- Checkout path is covered by in-memory SQLite transaction tests; no browser E2E timing harness is present in this repo.

## Manual UAT Sign-Off

Before Phase 12, run and record sign-off for each role:

| Role | Flow | Sign-off |
| --- | --- | --- |
| Kasir | Login/PIN, open shift, checkout cash/QRIS, receipt, close shift | Pending |
| Dapur | Kitchen board polling, status transition, outlet isolation | Pending |
| Manager | Refund/void/discount approval, outlet-scoped inbox | Pending |
| Inventory | Stock list, adjustment, negative-stock rejection | Pending |
| Owner | Dashboard/report review, outlet/date filtered numbers | Pending |

## Known Residual Risk

- Browser-level E2E tooling is not installed. Critical flows are covered at data/action level, but full UI timing and UAT sign-off remain manual unless Playwright/Cypress is added.
- Backup automation is implemented as npm/cron-ready scripts; production cron and off-host storage must be configured during Phase 12 deployment.
