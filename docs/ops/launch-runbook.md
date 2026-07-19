# Launch Runbook

Runbook go-live Wanna Dimsum POS untuk deployment VPS/Node.js.

## Prerequisites

- Node.js LTS tersedia di server.
- Repository sudah ter-clone ke direktori rilis, contoh `/srv/pos-wd/current`.
- Storage persisten tersedia untuk:
  - Database: `/srv/pos-wd/data/pos.db`
  - Backup: `/var/backups/pos-wd`
- Reverse proxy HTTPS mengarah ke `localhost:3000`.
- `.env` produksi dibuat dari `.env.example` dan tidak masuk git.

## Production Environment

Minimal `.env`:

```bash
DATABASE_URL=/srv/pos-wd/data/pos.db
BACKUP_DIR=/var/backups/pos-wd
BETTER_AUTH_URL=https://pos.wannadimsum.example
BETTER_AUTH_SECRET=<32+ chars random secret>
NEXT_PUBLIC_BETTER_AUTH_URL=https://pos.wannadimsum.example
```

Generate secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## Deploy Steps

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Build release:

   ```bash
   npm run typecheck
   npm run lint
   npm test -- --run
   npm run build
   ```

3. Prepare persistent directories:

   ```bash
   mkdir -p /srv/pos-wd/data /var/backups/pos-wd
   chmod 700 /srv/pos-wd/data /var/backups/pos-wd
   ```

4. Run migrations and seed initial production data:

   ```bash
   npm run db:push
   npm run db:seed
   ```

   The seed is idempotent. Rotate all default passwords/PINs before live traffic.

5. Run launch readiness check:

   ```bash
   npm run launch:check
   ```

6. Take a pre-live backup:

   ```bash
   npm run db:backup
   ```

7. Start production server:

   ```bash
   npm run start
   ```

8. Verify from the cashier network:

   ```bash
   curl -fsS https://pos.wannadimsum.example/api/health
   ```

## Systemd Unit Example

```ini
[Unit]
Description=Wanna Dimsum POS
After=network.target

[Service]
Type=simple
WorkingDirectory=/srv/pos-wd/current
EnvironmentFile=/srv/pos-wd/current/.env
ExecStartPre=/usr/bin/npm run launch:check
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5
User=poswd
Group=poswd

[Install]
WantedBy=multi-user.target
```

## Backup Cron

```cron
15 2 * * * cd /srv/pos-wd/current && npm run db:backup >> /var/log/pos-wd-backup.log 2>&1
30 2 * * * find /var/backups/pos-wd -name 'pos-wd-*.sqlite' -mtime +14 -delete
```

Run a restore drill before go-live:

```bash
RESTORE_TARGET=/tmp/pos-wd-restore.db npm run db:restore -- /var/backups/pos-wd/<backup>.sqlite
DATABASE_URL=/tmp/pos-wd-restore.db npm run launch:check
```

## Go-Live Checklist

- [ ] App reachable from cashier device network.
- [ ] `/api/health` returns `ok`.
- [ ] Production data verified by Owner/Manager.
- [ ] Default credentials rotated.
- [ ] Backup cron installed and latest backup verified.
- [ ] Each role completed SOP training.
- [ ] Rollback decision owner assigned.
