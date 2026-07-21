# U01-05 — Owner Reporting, Audit & UAT Revisi 01

**Status:** complete (2026-07-21).  
**Update refs:** semua poin revisi-01, terutama dampak laporan Owner.  
**Depends on:** U01-03, U01-04.  
**Blocks:** release revisi 01.

## Tujuan

Memastikan semua update Kasir terlihat benar di laporan Owner, audit trail, receipt, dan skenario UAT sebelum diserahkan ke klien.

## Scope laporan Owner

1. Sales by cashier
   - Tetap berdasarkan `orders.cashierId`/`users.id`, bukan nama bebas.

2. Sales by order type/channel
   - Dine-in
   - Take away
   - Delivery GoFood
   - Delivery GrabFood
   - Delivery ShopeeFood

3. Payment report
   - Cash
   - Kartu/EDC BCA
   - Kartu/EDC Mandiri
   - Kartu/EDC BCA Lainnya
   - Kartu/EDC Mandiri Lainnya
   - Transfer Rekening
   - Metode existing lain yang masih dipertahankan: QRIS/e-wallet.

4. Discount/promo report
   - Total discount amount.
   - Promo name/code jika ada.
   - Manual discount + approval jika dipakai.

5. Split payment
   - Laporan payment menjumlahkan payment lines.
   - Laporan sales menjumlahkan order sekali saja, bukan per payment line.

## Scope audit

Tambahkan/validasi audit action:

- `order.held`
- `order.resumed`
- `order.paid`
- `promotion.applied` atau `discount.applied`
- `payment.split.accepted` bila dibutuhkan untuk observability

## UAT skenario minimal

1. Login
   - Toggle lihat password bekerja.
   - Login kasir normal tetap sukses.

2. Dine-in
   - Isi nama pemesan + nomor meja.
   - Simpan Order.
   - Resume order.
   - Bayar cash.
   - Dapur/receipt menampilkan meja dan nama.

3. Take away
   - Isi nama pemesan.
   - Pakai promo.
   - Bayar EDC BCA.
   - Receipt dan laporan menunjukkan promo + EDC BCA.

4. GoFood
   - Pilih Delivery > GoFood.
   - Isi nama transaksi marketplace.
   - Bayar transfer rekening.
   - Owner report memisahkan GoFood dan transfer.

5. Split payment
   - Order dine-in.
   - Bayar sebagian cash, sebagian EDC Mandiri.
   - Sisa/kembalian benar.
   - Laporan sales tidak double-count.

## Acceptance criteria

- [x] Semua skenario UAT di atas pass.
- [x] Owner Dashboard/Report tidak rusak oleh payment split.
- [x] Cash close shift tetap benar setelah mixed/split payment.
- [x] Kitchen ticket tetap dibuat exactly once saat order dibayar.
- [x] Inventory deduction tetap exactly once saat order dibayar.
- [x] Typecheck, lint, build, dan test suite hijau.

## Definition of Done

- Dokumen evidence UAT dibuat di `docs/uat/` atau subfolder update yang disepakati.
- Ada screenshot/manual evidence untuk flow Kasir utama.
- Migration dan seed/sample data update tersedia.
- Tidak ada regresi auth, outlet scope, shift gate, idempotency, dan audit.


## Implementation notes

- Owner report snapshot sekarang mengekspos `orderChannels` (Dine-in, Take away, Delivery provider), `deliveryProviders`, dan `promoDiscounts`, selain payment line breakdown yang sudah ada.
- Owner Dashboard menampilkan ringkasan channel order; Owner Report memiliki table data untuk channel/saluran delivery dan promo/promosi.
- Audit action diregistrasi/divalidasi untuk `order.held`, `order.resumed`, `order.paid`, `promotion.applied`, dan `payment.split.accepted`.
- Evidence UAT dibuat di [`docs/uat/revisi-01-uat-evidence.md`](../../../uat/revisi-01-uat-evidence.md).
- Verifikasi akhir: `npm run typecheck`, `npm run lint`, `npm test`, dan `npm run build` semuanya hijau.

**Status: complete (2026-07-21).**
