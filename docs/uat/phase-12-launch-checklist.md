# Phase 12 Launch Checklist

Use this as the live go/no-go record. Repository-side launch assets are present;
actual go-live requires executing this checklist on the production server and
cashier network.

## Technical Readiness

- [ ] Production `.env` created from `.env.example`.
- [ ] `BETTER_AUTH_SECRET` generated and stored securely.
- [ ] `BETTER_AUTH_URL` and `NEXT_PUBLIC_BETTER_AUTH_URL` point to HTTPS production URL.
- [ ] `DATABASE_URL` points to persistent disk.
- [ ] `BACKUP_DIR` points to persistent/off-host synced directory.
- [ ] `npm ci` completed.
- [ ] `npm run db:push` completed.
- [ ] `npm run db:seed` completed.
- [ ] `npm run launch:check` returns `Status: ok`.
- [ ] `curl -fsS <production-url>/api/health` returns HTTP 200.

## Data Readiness

- [ ] Outlet/tax settings verified.
- [ ] Users and outlet assignments verified.
- [ ] Default passwords/PINs rotated.
- [ ] Catalog and recipes verified.
- [ ] Opening stock verified.
- [ ] Pre-live backup created and verified.

## Training

- [ ] Kasir SOP sign-off.
- [ ] Dapur SOP sign-off.
- [ ] Manager SOP sign-off.
- [ ] Inventory SOP sign-off.
- [ ] Owner SOP sign-off.

## Monitoring

- [ ] Systemd/reverse proxy logs accessible.
- [ ] `/api/health` monitored.
- [ ] Backup cron installed.
- [ ] Latest backup verify result recorded.
- [ ] First-day monitoring owner assigned.
- [ ] Rollback owner assigned.

## Go / No-Go

```text
Go-live date:
Release identifier:
Production URL:
Pre-live backup file:
Decision: GO / NO-GO
Approver:
Notes:
```
