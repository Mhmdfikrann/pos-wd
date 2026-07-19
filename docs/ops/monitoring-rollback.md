# Monitoring & Rollback

Phase 12 operating plan for first-day monitoring and rollback.

## Health Probes

Endpoint:

```bash
curl -fsS https://pos.wannadimsum.example/api/health
```

Expected response shape:

```json
{
  "ok": true,
  "status": "ok",
  "integrity": "ok",
  "missingTables": [],
  "tableCount": 17
}
```

Alert when:

- HTTP status is not 200.
- `ok` is false.
- `status` is not `ok`.
- Error rate rises above 1% for 5 minutes.
- SQLite lock errors appear repeatedly in logs.

## First-Day Monitoring

Monitor every 30 minutes during the first operational day:

- Successful login count per role.
- Open shifts and close-shift differences.
- Order count vs expected store traffic.
- Failed checkout/payment attempts.
- Kitchen ticket backlog and stale tickets.
- Stock deduction errors.
- Refund/void/discount approval queue.
- Latest backup timestamp and verify result.

Useful commands:

```bash
npm run launch:check
npm run db:backup:verify -- /var/backups/pos-wd/<latest>.sqlite
journalctl -u pos-wd -n 200 --no-pager
```

SQLite symptoms that require attention:

- `SQLITE_BUSY` or lock timeout repeated during checkout.
- Checkout latency repeatedly above 2 seconds.
- Kitchen polling latency repeatedly above 3 seconds.
- Report queries repeatedly above 5 seconds.

## Rollback Plan

Rollback has two levels: application rollback and database restore.

### Application Rollback

Use when the new release has UI/server errors but database state remains valid.

1. Stop the service:

   ```bash
   systemctl stop pos-wd
   ```

2. Point `/srv/pos-wd/current` to the previous release.
3. Run:

   ```bash
   npm ci
   npm run build
   npm run launch:check
   systemctl start pos-wd
   ```

4. Verify `/api/health`, login, and checkout smoke flow.

### Database Restore

Use only after a data-corruption decision. Prefer application rollback first.

1. Stop writes:

   ```bash
   systemctl stop pos-wd
   ```

2. Restore the chosen verified backup:

   ```bash
   RESTORE_TARGET=/srv/pos-wd/data/pos.db RESTORE_OVERWRITE=1 npm run db:restore -- /var/backups/pos-wd/<backup>.sqlite
   npm run launch:check
   ```

3. Start service and run smoke checks.

## Incident Log Template

```text
Time:
Reporter:
Impact:
Route/role affected:
Latest health status:
Latest backup:
Action taken:
Rollback needed: yes/no
Owner approval:
Resolution:
```
