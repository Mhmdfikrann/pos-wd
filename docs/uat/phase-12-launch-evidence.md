# Phase 12 Launch Evidence

Date: 2026-07-19

## Repository-Side Launch Assets

- Health/readiness:
  - `src/lib/health.ts`
  - `src/app/api/health/route.ts`
  - `npm run launch:check`
- Deployment and operations:
  - `docs/ops/launch-runbook.md`
  - `docs/ops/production-data-checklist.md`
  - `docs/ops/monitoring-rollback.md`
  - `docs/ops/backup-restore.md`
  - `docs/ops/postgresql-migration-path.md`
- Training and sign-off:
  - `docs/training/role-sop.md`
  - `docs/uat/phase-12-launch-checklist.md`

## Verification Evidence

- `npm test -- src/lib/health.test.ts --run`: 1 test file, 3 tests passed.
- `npm test -- --run`: 16 test files, 120 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run launch:check`: `Status: ok`, SQLite `Integrity: ok`, 29 tables.
- `npm run build`: passed; route output includes `/api/health`.
- Local HTTP probe: `curl -fsS http://localhost:3000/api/health` returned `{"ok":true,"status":"ok","integrity":"ok","missingTables":[],"tableCount":29}`.
- `npm audit --audit-level=high`: exit 0. Moderate advisories remain in upstream toolchain (`next`/`postcss`, `drizzle-kit`/`esbuild`) with no safe non-breaking fix from `npm audit`.

## Production Execution Still Required

These cannot be honestly marked complete until run on the target VPS/store
network:

- Deploy release on production server.
- Run `npm run db:push`, `npm run db:seed`, and rotate default credentials.
- Verify production outlet/user/catalog/recipe/opening-stock data.
- Install production backup cron and verify latest backup off-host.
- Run `/api/health` through the production HTTPS URL.
- Complete role training sign-off.
- Record go/no-go approval in `docs/uat/phase-12-launch-checklist.md`.
