# Phase 12 — Launch

> Bagian dari rangkaian fase Wanna Dimsum POS. Baca **[AGENTS.md](../../AGENTS.md)** lebih dulu — konvensi, stack, dan aturan "This is NOT the Next.js you know" berlaku penuh. Indeks fase: **[README.md](./README.md)**.

**PRD refs:** §21 (Dependencies), §13.4 (deployment), §23 (Phase 12).
**Depends on:** [Phase 11](./phase-11-hardening-uat.md).
**Blocks:** —

---

## Tujuan

Go-live: deploy ke server, siapkan data awal produksi, latih pengguna, aktifkan backup, dan pantau operasi awal.

## Scope

- **Deployment** — VPS/Node.js, persistent storage, env produksi (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`), migration dijalankan (§21).
- **Data awal produksi** — outlet, user + role, katalog + resep, opening stock, pengaturan pajak/outlet.
- **Backup** — automated backup + monitoring aktif (§13.6).
- **Training & SOP** — kasir, dapur, manager, inventory (§21).
- **Go-live monitoring** — pantau lock/slow query SQLite (§20.1), error rate, transaksi hari pertama.
- **Migration path** — dokumentasikan jalur ke PostgreSQL bila konkuren meningkat (§13.4, §20.1).

## Acceptance criteria

- [ ] Aplikasi ter-deploy & dapat diakses perangkat kasir (§21).
- [ ] Data produksi awal ter-seed & terverifikasi.
- [ ] Backup otomatis berjalan & restore teruji (§13.6).
- [ ] Semua role terlatih; SOP tersedia.
- [ ] Rencana rollback & monitoring aktif.

## Definition of Done

Sistem live, dipakai operasional nyata, backup berjalan, tidak ada critical issue pada periode pemantauan awal.
