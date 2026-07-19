# Phase 5 — POS & Payment

> Bagian dari rangkaian fase Wanna Dimsum POS. Baca **[AGENTS.md](../../AGENTS.md)** lebih dulu — konvensi, stack, dan aturan "This is NOT the Next.js you know" berlaku penuh. Indeks fase: **[README.md](./README.md)**.

**PRD refs:** §8.4 (POS), §8.5 (Payment), §10.2 (Create & Pay), FR-004, FR-005, FR-006, FR-007, BR-001, BR-002, BR-003, BR-004, BR-007, BR-008, BR-013, BR-015.
**Depends on:** [Phase 3](./phase-03-catalog.md) (produk), [Phase 4](./phase-04-shift-foundation.md) (shift aktif).
**Blocks:** [Phase 6](./phase-06-kitchen.md) (kitchen ticket dibuat saat paid), [Phase 7](./phase-07-inventory.md) (stok berkurang saat paid).

---

## Tujuan

Menghubungkan layar Kasir yang sudah ada (`src/app/kasir/page.tsx`, port faithful) ke backend nyata: order tercatat, pembayaran aman dari duplikasi, checkout dalam satu transaksi database. **Ini fase paling kritikal untuk integritas data.**

## Kondisi frontend saat ini (terverifikasi)

`/kasir` sudah lengkap secara visual & interaksi: category rail, product grid + stock tag, cart add/dec/remove, order-type (dine-in/takeaway/delivery), subtotal/PPN 11%/total, modal pembayaran (metode, keypad tunai, kembalian), modal struk "done". **Semua mock**: `PRODUCTS` konstan, cart `useState`, reset saat reload.

## Scope

- Wire cart → order draft di server.
- Checkout: buat `orders` + `orderItems` (snapshot) + `payments` dalam **satu DB transaction** (BR-007).
- Idempotency: `payments.idempotencyKey` unique (BR-003) + disable tombol Bayar saat processing.
- Order type, table no, guest count, item note, order note.
- Receipt view yang bisa dicetak ulang (FR-007) — saat ini "Cetak Struk" hanya label tombol tanpa view struk.
- Hold / resume order (status `held`).

## Acceptance criteria (PRD §10.2)

- [ ] Total dihitung benar (subtotal + pajak − diskon), semua integer rupiah (BR-002).
- [ ] Payment ganda dicegah: idempotency key + unique constraint + tombol disabled saat proses (BR-003).
- [ ] `orderItems` menyimpan snapshot nama, SKU, variant, price, cost (BR-004).
- [ ] Checkout diproses dalam DB transaction; gagal → rollback penuh (BR-007, NFR §13.2).
- [ ] Kitchen ticket & stock movement dibuat **tepat satu kali** (koordinasi dengan Phase 6 & 7).
- [ ] Order `paid` tidak dapat dibayar ulang.
- [ ] Payment ditolak jika tidak ada shift open (BR-008).

## Data model

Semua sudah ada: `orders`, `orderItems`, `payments`. Perhatikan:
- `orders.orderNo` unique (BR-001).
- `payments.idempotencyKey` unique (BR-003).
- `orderItems.*Snapshot` (BR-004).

## Server work

- `createOrder` / `updateCart` — draft order scoped ke shift + outlet.
- `checkout({ orderId, payment, idempotencyKey })`:
  - `db.transaction(...)`: finalize order → insert payment → (hook) create kitchen ticket + stock deduction.
  - Cek shift open (BR-008), cek order belum paid.
  - Return receipt data.
- Semua authz + outlet scope server-side (BR-010).

## Catatan integrasi

Kitchen ticket (Phase 6) dan stock deduction (Phase 7) idealnya dipicu **di dalam** transaksi checkout atau lewat outbox yang idempotent. Putuskan pola ini di sini dan dokumentasikan agar Phase 6 & 7 tinggal implement.

## Definition of Done

Lihat PRD §24. Wajib: integration test untuk double-payment, rollback, dan "paid tak bisa dibayar ulang" (critical flow → butuh E2E).
