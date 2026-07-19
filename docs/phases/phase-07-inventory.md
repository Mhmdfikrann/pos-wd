# Phase 7 — Inventory & Recipe

> Bagian dari rangkaian fase Wanna Dimsum POS. Baca **[AGENTS.md](../../AGENTS.md)** lebih dulu — konvensi, stack, dan aturan "This is NOT the Next.js you know" berlaku penuh. Indeks fase: **[README.md](./README.md)**.

**PRD refs:** §8.8 (Inventory & Recipe), FR-011, FR-012, FR-013, BR-006, BR-013, BR-014.
**Depends on:** [Phase 3](./phase-03-catalog.md) (product → recipe), [Phase 5](./phase-05-pos-payment.md) (payment → deduction).
**Blocks:** —

---

## Tujuan

Menghubungkan `/inventory` ke `inventoryItems` / `outletStock` / `stockMovements` nyata, dan menerapkan pengurangan stok otomatis berbasis resep saat penjualan (FR-013).

## Status implementasi

**Selesai di Phase 7.** `/inventory` sekarang DB-backed, stock adjustment lewat server action + audit, resep sudah di-seed, dan checkout memanggil `sale_deduction` di transaksi pembayaran yang sama.

## Kondisi frontend saat ini (terverifikasi)

`/inventory` lengkap: 4 kartu ringkasan (Total SKU, Nilai Persediaan, Perlu Restock, Hampir Kedaluwarsa), filter kategori + status, tabel stok, modal penyesuaian (Masuk/Keluar/Opname) dengan preview "stok sekarang → hasil". Data awal berasal dari `inventoryItems` + `outletStock` seeded dari 15 item mock. **Catatan:** Stok Opname resmi Post-MVP (PRD §9) tapi UI-nya sudah ada untuk validasi alur.

## Scope

- Inventory item + outlet stock (per-outlet, BR-010).
- Stock movement ledger — **setiap** perubahan stok lewat sini (BR-006), tipe: `in / out / adjustment / waste / sale_deduction / opname`.
- Recipe + recipe item (versioned, FR-012).
- **Automatic stock deduction** setelah payment berhasil (FR-013, BR-013) — idempotent, posting tepat sekali.
- Minimum stock + status menipis/habis.
- Manual adjustment (diaudit, BR-011).
- Negative stock ditolak pada alur normal (BR-014).

## Acceptance criteria

- [x] Setiap perubahan stok tercatat di `stockMovements` (BR-006). Manual adjustment dan `sale_deduction` sama-sama melewati ledger.
- [x] Deduction otomatis dari resep saat payment sukses, posting **tepat sekali** (idempotent, NFR §13.2). Guard service + partial unique index `stock_sale_deduction_unq`.
- [x] Negative stock ditolak (BR-014). Checkout rollback penuh jika bahan resep tidak cukup.
- [x] Manual adjustment masuk audit log (BR-011) via `writeAudit({ action: "stock.adjustment" })`.
- [x] Stok per-outlet terisolasi (BR-010) via `requireRoute`, `assertOutletAccess`, dan query scoped `outletIds`.

## Data model

`inventoryItems`, `outletStock` (unique outlet+item), `recipes` (versioned + variantId), `recipeItems`, `stockMovements` (ledger dgn `orderId`, `actorId`, tipe enum). Phase 7 menambahkan partial unique index untuk idempotency `sale_deduction`.

## Server work

- `adjustStock({ outletId, itemId, type, quantity, note })` — tulis ledger + update `outletStock`, audit via server action.
- `deductStockForOrder(orderId)` — resolve resep tiap order item, kurangi stok, ledger `sale_deduction`, idempotent per order (dipanggil dalam transaksi checkout Phase 5).
- `listStock({ outletIds })`.

## Catatan integrasi Phase 5

Deduction dipanggil di dalam transaksi checkout (BR-007). Jika payment gagal → rollback penuh, tidak ada movement tersisa (NFR §13.2).

## Definition of Done

Lihat PRD §24. Test ada di `src/lib/inventory-data.test.ts`, `src/lib/order-core.test.ts`, dan `src/db/seed-inventory.test.ts`: double-checkout tidak double-deduct, negative stock ditolak, outlet scope terjaga, seed recipe konsisten, dan manual adjustment melewati ledger + audit action.
