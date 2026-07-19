# Phase 8 — Cash & Close Shift

> Bagian dari rangkaian fase Wanna Dimsum POS. Baca **[AGENTS.md](../../AGENTS.md)** lebih dulu — konvensi, stack, dan aturan "This is NOT the Next.js you know" berlaku penuh. Indeks fase: **[README.md](./README.md)**.

**PRD refs:** §8.7 (Shift & Cash), Flow 10.4 (Close Shift), FR-009, FR-010, BR-008.
**Depends on:** [Phase 4](./phase-04-shift-foundation.md), [Phase 5](./phase-05-pos-payment.md).
**Blocks:** [Phase 10](./phase-10-reports.md) (shift reconciliation report).

---

## Tujuan

Melengkapi siklus hidup shift: cash in/out, expense, dan **Close Shift** dengan rekonsiliasi kas (expected vs actual vs difference) + manager approval.

## Gap terverifikasi

**Blocker** — Flow 10.4 tidak punya screen sama sekali. Tidak ada expected-cash calc, actual-cash input, difference display, closing notes, atau approval surface. `shifts.closingNote` ada di schema tapi tidak dirender.

## Scope

- Cash movement: `cash_in`, `cash_out`, `expense`, `adjustment` (tabel `cashMovements`, sudah ada).
- Operational expense.
- Close shift: hitung **expected cash** = opening + cash payment + cash in − cash out − cash refund.
- Input **actual cash** → **difference** otomatis.
- Closing notes **wajib** bila ada selisih.
- Manager approval bila selisih melewati ambang (Phase 0 decision — default konservatif: approval wajib untuk selisih apa pun bukan nol; ambang final = open question §22.5).

## Core flow — Close Shift (PRD 10.4)

1. Kasir pilih close shift.
2. Sistem hitung expected cash.
3. Kasir input actual cash.
4. Sistem hitung difference.
5. Kasir tambah catatan.
6. Manager approve bila perlu (→ [Phase 9](./phase-09-refund-void-discount.md) approval surface).
7. Shift ditutup.

## Acceptance criteria

- [ ] Transaksi baru ditolak setelah shift closed (BR-008).
- [ ] Cash payment, cash refund, cash in, cash out diperhitungkan dalam expected cash.
- [ ] Selisih kas **wajib** punya catatan.
- [ ] Shift yang ditutup **tidak dapat diedit** oleh kasir.
- [ ] Cash adjustment masuk audit log (BR-011).

## Server work

- `recordCashMovement({ shiftId, type, amount, note })` — audit bila adjustment.
- `closeShift({ shiftId, actualCash, note })` — hitung expected, difference, set status `closed`, `closedAt`; tolak bila kasir & difference≠0 tanpa note; gate approval sesuai ambang.

## Definition of Done

Lihat PRD §24. Test: expected-cash math (semua komponen kas), tolak transaksi setelah close, selisih tanpa note ditolak, immutability shift closed.
