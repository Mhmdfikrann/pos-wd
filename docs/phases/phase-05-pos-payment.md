# Phase 5 — POS & Payment

> Bagian dari rangkaian fase Wanna Dimsum POS. Baca **[AGENTS.md](../../AGENTS.md)** lebih dulu — konvensi, stack, dan aturan "This is NOT the Next.js you know" berlaku penuh. Indeks fase: **[README.md](./README.md)**.

**Status:** complete (2026-07-19).
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

- [x] Total dihitung benar (subtotal + pajak − diskon), semua integer rupiah (BR-002). *`order-math.ts` (`computeTotals`): pajak dibulatkan sekali di atas subtotal-setelah-diskon, `total = subtotal − diskon + pajak`; diuji `order-math.test.ts` (15 test). Server yang otoritatif — total klien hanya untuk tampilan.*
- [x] Payment ganda dicegah: idempotency key + unique constraint + tombol disabled saat proses (BR-003). *Idempotency-key di-mint sekali per attempt di klien; pre-check + unique index `payments.idempotency_key`; tombol Bayar `disabled` saat `paying`. Race → replay receipt, bukan error.*
- [x] `orderItems` menyimpan snapshot nama, SKU, variant, price, cost (BR-004). *`order-core.ts` menyalin `nameSnapshot/skuSnapshot/priceSnapshot/costSnapshot` dari row produk DB saat checkout; diuji `order-core.test.ts`.*
- [x] Checkout diproses dalam DB transaction; gagal → rollback penuh (BR-007, NFR §13.2). *Satu `db.transaction` sinkron (better-sqlite3). Diuji: cash<total / produk tak ada / produk habis → throw, **nol** baris tertulis.*
- [x] Kitchen ticket dibuat **tepat satu kali** (Phase 6) dan stock movement `sale_deduction` dipanggil di transaksi checkout yang sama (Phase 7). *Unique index `kitchen_tickets_order_unq` + `stock_sale_deduction_unq`.*
- [x] Order `paid` tidak dapat dibayar ulang. *Idempotency-key sama → receipt di-replay (`replayed=true`), bukan charge kedua; hanya 1 order + 1 payment. Backstop: unique `payments.idempotency_key`.*
- [x] Payment ditolak jika tidak ada shift open (BR-008). *Action me-resolve shift open kasir server-side; ditolak jika tak ada. Di dalam transaksi, status shift diverifikasi ulang.*

## Keputusan integrasi (untuk Phase 6 & 7)

Doc ini diminta memutuskan pola pemicu kitchen ticket + stock deduction. **Keputusan: keduanya di-*insert di dalam* transaksi checkout yang sama** (bukan outbox). Alasannya: app ini SQLite satu-proses, jadi transaksi tunggal sudah memberi jaminan atomik + exactly-once yang paling sederhana dan benar; outbox baru perlu kalau pemicunya lintas-proses/lintas-service.

- **Kitchen ticket (Phase 6):** sudah diinsert di transaksi checkout, dijaga unique index `kitchen_tickets.order_id` (tepat satu per order). Phase 6 tinggal menambah routing per-station + transisi status.
- **Stock deduction (Phase 7):** sudah dilakukan. `order-core.ts` memanggil `deductStockForOrderInTransaction` setelah payment + kitchen ticket, masih di `tx` yang sama. Baris `stock_movements` tipe `sale_deduction` idempotent per order + ingredient lewat partial unique index.

## Data model

Semua sudah ada: `orders`, `orderItems`, `payments`, `kitchen_tickets`. Guard yang ditambah fase ini:
- `orders.orderNo` unique (BR-001), `payments.idempotencyKey` unique (BR-003) — sudah ada di schema.
- **Baru:** unique index `kitchen_tickets_order_unq ON (order_id)` — migration `drizzle/0002_nosy_hawkeye.sql`.

## What shipped this phase

- `src/lib/order-math.ts` — perhitungan total murni (subtotal/diskon/pajak/total, integer rupiah), `computeChange`; 15 unit test (`order-math.test.ts`).
- `src/lib/order-core.ts` — logika checkout inti (db-parameterized): transaksi sinkron, harga dari DB, idempotency replay, tiket dapur exactly-once. **Catatan penting:** insert di dalam `db.transaction` better-sqlite3 **wajib** `.run()` — builder-nya lazy, tanpa `.run()` transaksi commit kosong (ditemukan & diperbaiki via integration test).
- `src/lib/order.ts` — wrapper `server-only` yang mengikat `db` singleton.
- `src/lib/order-actions.ts` — `actionCheckout`: gate `payment.accept`, outlet-scope (BR-010), resolve shift server-side, audit `order.paid`, replay-on-race.
- `src/lib/order-core.test.ts` — 11 integration test terhadap SQLite in-memory (migrasi asli): total/snapshot, idempotency/double-pay, rollback (3 varian), shift gate, tiket exactly-once, cart kosong.
- `src/app/kasir/KasirClient.tsx` — modal bayar → `actionCheckout`; tombol Bayar disabled saat proses; struk "done" pakai nomor order asli; idempotency-key per transaksi.
- Audit action `order.paid` ditambah ke `src/lib/audit.ts`.

## Definition of Done

PRD §24 gate: typecheck + lint + build + 78 test hijau. Integration test wajib (double-payment, rollback, paid-tak-bisa-dibayar-ulang) hijau terhadap DB nyata. Diverifikasi runtime pada dev DB: checkout → order+payment+ticket, replay idempotent tanpa double charge, cash<total rollback.

> Belum di scope fase ini (tercatat jujur): **hold/resume order** (status `held`) dan **reprint struk** dari order lama belum diwire ke UI — `buildReceipt` sudah ada sebagai fondasi reprint (FR-007). Item note / order note / guest count sudah didukung service tapi belum ada input UI-nya. Diangkat ke Phase 6+ atau follow-up.
