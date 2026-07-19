# Backup & Restore

Operational runbook for Wanna Dimsum POS SQLite persistence (PRD §13.6, §20.5).

## Daily Backup

Run once per day from the production host:

```bash
BACKUP_DIR=/var/backups/pos-wd npm run db:backup
```

The command uses `DATABASE_URL` from `.env`, writes a timestamped `.sqlite`
backup, verifies `pragma integrity_check`, and prints size + SHA-256 metadata.

Recommended cron:

```cron
15 2 * * * cd /srv/pos-wd && BACKUP_DIR=/var/backups/pos-wd npm run db:backup >> /var/log/pos-wd-backup.log 2>&1
```

Retention policy:

- Keep daily backups for 14 days.
- Keep weekly Sunday backups for 8 weeks.
- Keep monthly first-day backups for 12 months.
- Copy at least one retained backup off-host.

## Verify Backup

```bash
npm run db:backup:verify -- /var/backups/pos-wd/pos-wd-YYYYMMDD-HHMMSS.sqlite
```

Expected output includes:

```text
Integrity: ok
Rows: <non-zero row count>
```

## Restore Drill

Never restore straight over production first. Restore into a separate target and
run smoke checks:

```bash
RESTORE_TARGET=/tmp/pos-wd-restore.db npm run db:restore -- /var/backups/pos-wd/pos-wd-YYYYMMDD-HHMMSS.sqlite
DATABASE_URL=/tmp/pos-wd-restore.db npm run db:seed
```

Only replace the active DB after an explicit downtime decision:

```bash
RESTORE_TARGET=/srv/pos-wd/data/pos.db RESTORE_OVERWRITE=1 npm run db:restore -- /var/backups/pos-wd/pos-wd-YYYYMMDD-HHMMSS.sqlite
```

## Targets

- RPO: <= 24 hours via daily backup.
- RTO: <= 4 hours via verified restore command + smoke checks.
- Backup files are ignored by git (`/backups`, `*.sqlite`) and must be stored on
  persistent disk/off-host storage, not inside ephemeral deploy output.
