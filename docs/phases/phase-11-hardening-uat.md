# Phase 11 — Hardening & UAT

> Bagian dari rangkaian fase Wanna Dimsum POS. Baca **[AGENTS.md](../../AGENTS.md)** lebih dulu — konvensi, stack, dan aturan "This is NOT the Next.js you know" berlaku penuh. Indeks fase: **[README.md](./README.md)**.

**PRD refs:** §13 (NFR), §20 (Risks), §24 (DoD).
**Depends on:** Phase 2–10.
**Blocks:** [Phase 12](./phase-12-launch.md).

---

## Tujuan

Menutup risiko PRD §20, memvalidasi NFR §13, dan menjalankan UAT sebelum go-live.

## Scope

- **Security review** — server-side authz di semua route/action (BR-010), IDOR/cross-outlet test (§20.4), input validation, secret tidak di repo (§13.3), audit log lengkap (§8.10).
- **Performance review** — POS < 3s, checkout < 2s, kitchen ticket < 3s, laporan harian < 5s (§13.1).
- **E2E testing** — critical flows: open shift → order → pay → kitchen → close shift; refund + approval.
- **Reliability** — no double payment/stock posting, checkout rollback penuh (§13.2, §20.1–20.3).
- **Backup & restore test** — persistent disk, automated backup, restore drill (§13.6, §20.5).
- **UAT** — kasir, dapur, manager, inventory, owner.

## Acceptance criteria

- [ ] Cross-outlet & IDOR test lulus (§20.4).
- [ ] Idempotency & rollback test lulus (§20.1).
- [ ] Stock posting idempotent, tidak ganda (§20.3).
- [ ] Backup harian + restore terverifikasi (RPO ≤ 24j, RTO ≤ 4j, §13.6).
- [ ] `lint`, `typecheck`, `build` hijau; no critical bug (§24).

## Definition of Done

Lihat PRD §24. UAT ditandatangani per role sebelum lanjut ke Phase 12.
