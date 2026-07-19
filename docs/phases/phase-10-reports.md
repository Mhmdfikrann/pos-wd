# Phase 10 — Reports

> Bagian dari rangkaian fase Wanna Dimsum POS. Baca **[AGENTS.md](../../AGENTS.md)** lebih dulu — konvensi, stack, dan aturan "This is NOT the Next.js you know" berlaku penuh. Indeks fase: **[README.md](./README.md)**.

**PRD refs:** §8.9, §16 (Reporting), §18.2 (Business Metrics), FR-015.
**Depends on:** [Phase 5](./phase-05-pos-payment.md), [Phase 7](./phase-07-inventory.md), [Phase 8](./phase-08-cash-close-shift.md), [Phase 9](./phase-09-refund-void-discount.md).
**Blocks:** —

---

## Tujuan

Mengganti data contoh Owner Dashboard + archetype ReportPage dengan laporan nyata ber-query, difilter date range + outlet.

## Gap terverifikasi

- **Medium** — seluruh Owner suite mock-driven; `CHART/PAY/TOP/RECENT` + `tableData()` hardcoded. Dashboard Penjualan bespoke tapi statis.
- **Low** — `Dashboard Keuangan` tidak punya screen bespoke (fall-through ke archetype report). Bila laporan keuangan nyata diinginkan, desain net-new (konfirmasi scope ke sumber desain).
- **Low** — ReportPage/FormPage render konten placeholder tetap tanpa melihat label.

## Scope (PRD 8.9)

- Daily & monthly sales.
- Sales by product / category / cashier / payment method.
- Shift reconciliation.
- Current inventory.
- Refund, void, discount, expense.

## Acceptance criteria

- [x] Setiap laporan difilter date range + outlet (FR-015, BR-010 outlet scope server-side).
- [x] Laporan harian terbuka < 5 detik (NFR 13.1).
- [x] Angka cocok dengan sumber transaksi (rekonsiliasi).
- [x] Owner Dashboard Penjualan di-wire ke query nyata (ganti `data.ts`).

## Implementasi

- `src/lib/reports-data.ts` menyediakan service agregasi laporan DB-parameterized dengan `from` inklusif, `to` eksklusif, dan `outletIds` dari scope server-side.
- `src/lib/reports.ts` mengikat service ke app DB dan menyediakan snapshot periode Owner (`Hari ini`, `Minggu ini`, `Bulan ini`) dengan batas hari Asia/Jakarta.
- `src/app/owner/page.tsx` menjadi server fetcher; shell interaktif dipindahkan ke `OwnerClient.tsx`.
- `Dashboard Penjualan` dan `ReportPage` memakai snapshot nyata untuk sales, product/category/cashier/payment method, shift reconciliation, inventory, serta refund/void/discount/expense.
- `src/lib/reports-data.test.ts` memverifikasi outlet scope, date range, rekonsiliasi angka, dan performa dataset lokal.

## Catatan fidelity

Owner archetype pages (Table/Report/Form/Board) adalah **fitur mockup**, bukan shortcut porting. Ganti sumber data-nya, pertahankan layout. Laporan berbasis tren (Penjualan/Analisa/Arus Kas) sudah punya slot grafik di ReportPage.

## Definition of Done

Lihat PRD §24. Test: agregasi benar vs seed, outlet scope diuji lintas-outlet, performa < 5s pada dataset wajar.
