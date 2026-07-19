# Phase 7 — Inventory & Recipe

> Bagian dari rangkaian fase Wanna Dimsum POS. Baca **[AGENTS.md](../../AGENTS.md)** lebih dulu — konvensi, stack, dan aturan "This is NOT the Next.js you know" berlaku penuh. Indeks fase: **[README.md](./README.md)**.

**PRD refs:** §8.8 (Inventory & Recipe), FR-011, FR-012, FR-013, BR-006, BR-013, BR-014.
**Depends on:** [Phase 3](./phase-03-catalog.md) (product → recipe), [Phase 5](./phase-05-pos-payment.md) (payment → deduction).
**Blocks:** —

---

## Tujuan

Menghubungkan `/inventory` ke `inventoryItems` / `outletStock` / `stockMovements` nyata, dan menerapkan pengurangan stok otomatis berbasis resep saat penjualan (FR-013).

## Kondisi frontend saat ini (terverifikasi)

`/inventory` lengkap: 4 kartu ringkasan (Total SKU, Nilai Persediaan, Perlu Restock, Hampir Kedaluwarsa), filter kategori + status, tabel stok, modal penyesuaian (Masuk/Keluar/Opname) dengan preview "stok sekarang → hasil". `INITIAL_ITEMS` = 15 item mock. **Catatan:** Stok Opname resmi Post-MVP (PRD §9) tapi UI-nya sudah ada untuk validasi alur.

## Scope

- Inventory item + outlet stock (per-outlet, BR-010).
- Stock movement ledger — **setiap** perubahan stok lewat sini (BR-006), tipe: `in / out / adjustment / waste / sale_deduction / opname`.
- Recipe + recipe item (versioned, FR-012).
- **Automatic stock deduction** setelah payment berhasil (FR-013, BR-013) — idempotent, posting tepat sekali.
- Minimum stock + status menipis/habis.
- Manual adjustment (diaudit, BR-011).
- Negative stock ditolak pada alur normal (BR-014).

## Acceptance criteria

- [ ] Setiap perubahan stok tercatat di `stockMovements` (BR-006).
- [ ] Deduction otomatis dari resep saat payment sukses, posting **tepat sekali** (idempotent, NFR §13.2).
- [ ] Negative stock ditolak (BR-014).
- [ ] Manual adjustment masuk audit log (BR-011).
- [ ] Stok per-outlet terisolasi (BR-010).

## Data model

`inventoryItems`, `outletStock` (unique outlet+item), `recipes` (versioned + variantId), `recipeItems`, `stockMovements` (ledger dgn `orderId`, `actorId`, tipe enum). Semua sudah ada.

## Server work

- `adjustStock({ outletId, itemId, type, quantity, note })` — tulis ledger + update `outletStock`, audit bila adjustment.
- `deductForOrder(orderId)` — resolve resep tiap order item, kurangi stok, ledger `sale_deduction`, idempotent per order (dipanggil dalam transaksi checkout Phase 5).
- `listStock({ outletId, category?, status? })`.

## Catatan integrasi Phase 5

Deduction dipanggil di dalam transaksi checkout (BR-007). Jika payment gagal → rollback penuh, tidak ada movement tersisa (NFR §13.2).

## Definition of Done

Lihat PRD §24. Test: double-checkout tidak double-deduct, negative stock ditolak, cross-outlet isolation, adjustment teraudit.
