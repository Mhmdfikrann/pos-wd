# Phase 4 — Shift Foundation

> Bagian dari rangkaian fase Wanna Dimsum POS. Baca **[AGENTS.md](../../AGENTS.md)** lebih dulu — konvensi, stack, dan aturan "This is NOT the Next.js you know" berlaku penuh. Indeks fase: **[README.md](./README.md)**.

**PRD refs:** §8.7 (Shift & Cash), §10.1 (Open Shift), FR-009, BR-008.
**Depends on:** [Phase 2](./phase-02-auth-outlet.md) (butuh user + outlet scope).
**Blocks:** [Phase 5](./phase-05-pos-payment.md) (payment digate oleh shift open).

---

## Tujuan

Membangun siklus **buka shift** dan konsep **shift aktif** — fondasi yang menggate semua transaksi. Ini bagian pertama dari lifecycle shift; penutupan + rekonsiliasi ada di [Phase 8](./phase-08-cash-close-shift.md).

## Scope

- Open shift: pilih outlet (dari outlet yang di-assign ke user), input `openingCash`.
- Satu shift aktif per (outlet, kasir) — invariant keras.
- Konsep "shift aktif" yang bisa dibaca server saat checkout.
- UI: modal / layar buka shift di `/kasir`. Saat ini `/kasir` hanya menampilkan badge statis `Shift · 4j 12m` (kasir/page.tsx:285) — badge itu harus jadi state nyata dari shift terbuka.

## Acceptance criteria (PRD §10.1)

- [ ] Kasir hanya punya **satu shift aktif per outlet** (enforced server-side, unique-ish guard).
- [ ] Pembayaran **ditolak** jika tidak ada shift aktif (BR-008 — enforcement penuh diverifikasi di Phase 5).
- [ ] `openingCash` **tidak boleh negatif**.
- [ ] Aktivitas open shift dicatat ke `auditLogs`.

## Data model

Sudah ada di `src/db/schema.ts`:
- `shifts` — `status: open|closed`, `openingCash`, `expectedCash`, `actualCash`, `cashDifference`, `openedAt`, `closedAt`.
- `cashMovements` — dipakai penuh di Phase 8.

Tidak perlu tabel baru untuk fase ini.

## Server work

- `openShift({ outletId, openingCash })` — server action / route:
  - Verifikasi user boleh akses `outletId` (`userOutlets`).
  - Tolak jika sudah ada `shifts` open untuk (outlet, cashier).
  - Tolak `openingCash < 0`.
  - Insert `shifts` (status=open), tulis `auditLogs`.
- `getActiveShift(outletId)` — helper dibaca oleh POS.

## UI work

- Buka shift = **gate** sebelum grid produk kasir bisa dipakai. Jika belum ada shift aktif → tampilkan layar buka shift, bukan katalog.
- Badge shift di header jadi live (durasi dari `openedAt`).

## Definition of Done

Lihat PRD §24. Minimal: server authz + validasi, unit test invariant "satu shift aktif", audit tercatat, lint + typecheck + build hijau.
