# PostgreSQL Migration Path

The current launch target is SQLite on persistent disk. This is valid for a
single-store/internal POS launch, but PRD §13.4 requires a clear path to
PostgreSQL if concurrency grows.

## Migration Triggers

Start PostgreSQL migration planning when any of these persist for more than one
operational week:

- Repeated `SQLITE_BUSY` during checkout or inventory posting.
- Checkout p95 > 2 seconds caused by DB locks.
- Kitchen ticket polling p95 > 3 seconds caused by DB contention.
- Multiple outlets require concurrent heavy reporting during service hours.
- Need for managed backups, replicas, or remote analytics.

## Current Portability Boundaries

- Data model is defined in Drizzle schema: `src/db/schema.ts`.
- Data access is already centralized in `src/lib/*-data.ts` and wrappers.
- Server routes/actions do not construct SQL strings from user input.
- SQLite-specific assumptions to review:
  - `better-sqlite3` synchronous transaction model.
  - SQLite partial unique indexes in migrations.
  - Text timestamp storage.
  - Local file backup scripts.

## Migration Steps

1. Add PostgreSQL driver and Drizzle connection branch.
2. Generate PostgreSQL migrations from `src/db/schema.ts`.
3. Port SQLite-specific indexes/defaults.
4. Replace SQLite file backup with `pg_dump` and managed backup policy.
5. Run data migration in staging:

   ```bash
   sqlite3 /srv/pos-wd/data/pos.db .dump > /tmp/pos-wd.sql
   # Transform schema/data as needed, then import into PostgreSQL staging.
   ```

6. Run full verification:

   ```bash
   npm run typecheck
   npm run lint
   npm test -- --run
   npm run build
   ```

7. Run UAT smoke flows for all roles.
8. Cut over during downtime window after verified backup.

## Non-Goals For SQLite Launch

- Multi-writer HA.
- Cross-region replication.
- Heavy analytics against production DB during store hours.

Those belong to the PostgreSQL migration phase, not the initial SQLite launch.
