# U01-03 — Kasir: Simpan Order & Promosi

**Status:** complete (2026-07-21).  
**Update refs:** revisi-01 poin 6–7.  
**Depends on:** U01-02.  
**Blocks:** U01-05.

## Tujuan

Mengubah tombol “Tahan” menjadi “Simpan Order” sesuai bahasa owner dan mengimplementasikan penyimpanan order tertahan secara nyata, plus menyediakan entry point promosi di halaman pemesanan menu.

## Kondisi saat ini

- Phase 5 mencatat hold/resume order belum diwire ke UI.
- `orders.status` sudah memiliki enum `held`.
- `discountAmount` ada di checkout service, tetapi promo/diskon belum menjadi fitur UI yang server-authoritative.

## Scope Simpan Order

1. UI
   - Rename tombol “Tahan” menjadi “Simpan Order”.
   - Jika cart kosong, tombol disabled atau menampilkan state informatif.
   - Tambahkan affordance “Buka Order Tersimpan” bila ada held order.

2. Backend
   - Server action untuk create/update held order.
   - Held order menyimpan cart items snapshot/current price sesuai aturan yang diputuskan.
   - Resume held order ke cart.
   - Saat checkout dari held order, pastikan tidak double-create order dan tetap idempotent.

3. Audit
   - Audit `order.held`, `order.resumed`, dan `order.paid` bila relevant.

## Scope Promosi

1. UI
   - Tambahkan tombol “Promosi” di halaman pemesanan menu/cart.
   - Modal/list promo yang bisa dipilih.
   - Tampilkan diskon aktif di breakdown subtotal/PPN/total.

2. Backend
   - Promo/diskon dihitung atau divalidasi server-side.
   - Jika manual discount diizinkan, wajib mengikuti permission/approval Phase 9.

3. Data model rekomendasi
   - MVP ringan: `promotions` table + `orders.promo_id`/`promo_name_snapshot` bila perlu.
   - Minimal: simpan `discountAmount` + `note/detail` audit, tetapi laporan promo akan terbatas.

## Non-scope

- Campaign engine kompleks seperti voucher per customer, kuota harian, stacking rules multi promo, atau sinkronisasi marketplace.

## Acceptance criteria

- [x] Label tombol “Tahan” tidak muncul lagi di UI Kasir; diganti “Simpan Order”.
- [x] Order tersimpan bertahan setelah reload dan bisa dibuka kembali.
- [x] Checkout order tersimpan tidak membuat duplikasi order/payment.
- [x] Tombol Promosi tersedia di halaman pemesanan menu.
- [x] Diskon promo terlihat di cart, checkout modal, receipt, dan laporan diskon.
- [x] Diskon tidak bisa dimanipulasi dari client.

## Test/verification

- Integration test save/resume/pay held order.
- Integration test promo valid/invalid.
- Manual: simpan order dine-in dengan meja/nama, reload, resume, bayar.


## Implementation notes

- Tombol cart “Tahan” diganti menjadi **“Simpan Order”** dan tombol **“Promosi”** ditambahkan. UI juga menampilkan affordance **“Buka Order Tersimpan”** saat ada held order.
- Held order sekarang benar-benar disimpan ke DB sebagai `orders.status = held` + `order_items`, tanpa membuat payment, kitchen ticket, atau stock deduction. Resume memuat kembali item, context order U01-02, dan promo.
- Checkout dari held order memakai `heldOrderId` dan mengubah order yang sama menjadi `paid`; idempotency payment tetap berdasarkan `payments.idempotency_key`, sehingga retry tidak membuat order/payment/kitchen ticket ganda.
- Promo MVP memakai tabel `discounts` sebagai predefined promo aktif. Client hanya mengirim `promoId`; server mengambil promo aktif dari DB dan menghitung ulang nominal diskon dari subtotal server-side.
- `orders` ditambah `promo_id` dan `promo_name_snapshot` melalui migration `drizzle/0007_oval_ben_parker.sql`. Seed dev menambahkan dua promo aktif contoh.
- Audit action ditambahkan untuk `order.held`, `order.resumed`, dan existing `order.paid` menyimpan detail promo/diskon.

**Status: complete (2026-07-21).**
