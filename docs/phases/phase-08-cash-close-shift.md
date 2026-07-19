# Phase 8 — Cash & Close Shift

> Bagian dari rangkaian fase Wanna Dimsum POS. Baca **[AGENTS.md](../../AGENTS.md)** lebih dulu — konvensi, stack, dan aturan "This is NOT the Next.js you know" berlaku penuh. Indeks fase: **[README.md](./README.md)**.

**PRD refs:** §8.7 (Shift & Cash), Flow 10.4 (Close Shift), FR-009, FR-010, BR-008.
**Depends on:** [Phase 4](./phase-04-shift-foundation.md), [Phase 5](./phase-05-pos-payment.md).
**Blocks:** [Phase 10](./phase-10-reports.md) (shift reconciliation report).

---

## Tujuan

Melengkapi siklus hidup shift: cash in/out, expense, dan **Close Shift** dengan rekonsiliasi kas (expected vs actual vs difference) + manager approval.

## Status implementasi

**Selesai di Phase 8.** POS kasir sekarang punya modal **Tutup Shift**: expected-cash dihitung server-side, kas aktual diinput kasir, difference dihitung otomatis, catatan wajib bila ada selisih, dan shift closed memindahkan kasir kembali ke gate buka shift. Modal yang sama juga mencatat cash in/out, expense, dan adjustment.

## Gap terverifikasi awal

**Blocker** — Flow 10.4 sebelumnya tidak punya screen sama sekali. Tidak ada expected-cash calc, actual-cash input, difference display, closing notes, atau approval surface. `shifts.closingNote` ada di schema tapi tidak dirender.

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

- [x] Transaksi baru ditolak setelah shift closed (BR-008). Checkout tetap re-check `shifts.status = "open"` di transaksi.
- [x] Cash payment, cash refund, cash in, cash out diperhitungkan dalam expected cash. `computeExpectedCash` juga mengurangi `expense` dan menambahkan `adjustment`.
- [x] Selisih kas **wajib** punya catatan. `closeShift` menolak `cashDifference !== 0` tanpa note.
- [x] Shift yang ditutup **tidak dapat diedit** oleh kasir. `recordCashMovement` dan `closeShift` menolak shift closed.
- [x] Cash adjustment masuk audit log (BR-011). `actionRecordCashMovement(type:"adjustment")` menulis `cash.adjustment`; close shift menulis `shift.close`.

## Server work

- `recordCashMovement({ shiftId, type, amount, note })` — audit bila adjustment.
- `closeShift({ shiftId, actualCash, note })` — hitung expected, difference, set status `closed`, `closedAt`; tolak bila difference≠0 tanpa note. Ambang approval tetap konservatif (non-zero difference perlu note); approval surface penuh masuk Phase 9.
- `computeExpectedCash(shiftId)` — opening cash + cash payments + cash in + adjustment − cash out − expense − cash refunds.

## Definition of Done

Lihat PRD §24. Test ada di `src/lib/cash-data.test.ts` dan regresi checkout closed-shift di `src/lib/order-core.test.ts`: expected-cash math, tolak transaksi setelah close, selisih tanpa note ditolak, dan closed shift immutable.
