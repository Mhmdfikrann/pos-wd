# U01-04 — Payment: EDC, Transfer Rekening, Split Payment

**Status:** complete (2026-07-21).  
**Update refs:** revisi-01 poin 8–10.  
**Depends on:** U01-02.  
**Blocks:** U01-05.

## Tujuan

Memperluas halaman bayar agar sesuai permintaan owner: metode Non Tunai > Kartu > EDC detail, Transfer Rekening, dan Pisah Bayar.

## Kondisi saat ini

- `payments.method` enum: `cash | qris | transfer | ewallet`.
- `payments` secara schema bisa banyak baris per order, tetapi checkout core saat ini menginsert satu payment sebesar total.
- `CheckoutInput.payment` hanya satu object.
- Cash validation memakai `cashReceived` untuk satu pembayaran.

## Scope UI

1. Metode Non Tunai > Kartu
   - EDC BCA
   - EDC Mandiri
   - EDC BCA Lainnya
   - EDC Mandiri Lainnya
   - Field reference/batch/approval code jika diperlukan owner.

2. Transfer Rekening
   - Pilihan rekening/bank tujuan.
   - Field reference no.

3. Pisah Bayar
   - User bisa menambah beberapa payment line.
   - Setiap line punya method/provider, amount, dan reference/cash received bila relevant.
   - UI menampilkan total tagihan, total dibayar, sisa, dan kembalian untuk cash.

## Scope backend/data

Rekomendasi schema:

- Extend `payments`:
  - `provider text` contoh: `edc_bca`, `edc_mandiri`, `edc_bca_lainnya`, `edc_mandiri_lainnya`, `bank_transfer`.
  - `channel_label text` optional untuk tampilan/report snapshot.
- Pertimbangkan menambah enum method `card`, atau map kartu ke method existing `transfer/ewallet` tidak direkomendasikan karena laporan jadi rancu.
- Checkout input berubah dari `payment` menjadi `payments: PaymentLine[]`.

Validasi server:

- Sum payment lines harus sama dengan `order.total`, kecuali cash overpay boleh menghasilkan change amount.
- Setidaknya satu payment line.
- Reference wajib untuk non-cash sesuai keputusan owner.
- Idempotency tetap satu key per checkout attempt/order, bukan per payment line.
- Insert order + items + all payment lines + kitchen ticket + stock deduction tetap dalam satu transaction.

## Reports impact

- Payment method report harus bisa menampilkan:
  - Cash
  - QRIS/e-wallet jika masih ada
  - Kartu: EDC BCA/Mandiri/BCA Lainnya/Mandiri Lainnya
  - Transfer rekening
  - Split payment sebagai order flag atau dilihat dari order dengan >1 payment lines.

## Acceptance criteria

- [x] Modal bayar memiliki hierarchy Non Tunai > Kartu dengan 4 pilihan EDC.
- [x] Modal bayar memiliki Transfer Rekening dengan input reference.
- [x] Kasir bisa menyelesaikan pembayaran split sampai total lunas.
- [x] Sistem menolak kurang bayar.
- [x] Cash overpay menghasilkan kembalian yang benar.
- [x] Double-submit tetap tidak membuat pembayaran ganda.
- [x] Receipt menampilkan seluruh payment lines.
- [x] Reports Owner menghitung semua line payment tanpa double-count order sales.

## Test/verification

- Unit test payment math split: exact, underpay, cash overpay, multiple non-cash.
- Integration test checkout split payment: jumlah baris payments sesuai input; total order tidak dobel.
- Integration test idempotency split payment.
- Manual `/kasir`: bayar separuh cash + separuh EDC BCA; receipt benar.


## Implementation notes

- `payments` diperluas melalui `drizzle/0008_rapid_pestilence.sql`: `provider`, `channel_label`, `line_no`, dan `request_idempotency_key`; method schema/type mendukung `card`.
- Checkout core sekarang menerima `payments: PaymentLineInput[]` untuk split payment, tetapi tetap kompatibel dengan `payment` single-line lama. Server memvalidasi minimal satu line, total line harus sama dengan total order, reference wajib untuk non-cash, provider wajib untuk EDC/transfer, dan cash overpay menghasilkan `change_amount`.
- Idempotency split memakai satu request key (`request_idempotency_key`) untuk replay; tiap row tetap punya `idempotency_key` unik per line (`key:lineNo`) agar tidak double insert.
- Modal bayar Kasir menampilkan Non Tunai > Kartu dengan EDC BCA/Mandiri/BCA Lainnya/Mandiri Lainnya, Transfer Rekening BCA/Mandiri, field reference, dan panel Pisah Bayar dengan total dibayar/sisa.
- Receipt sukses menampilkan seluruh payment lines. Owner payment report memakai provider/channel label agar EDC dan transfer terpisah, sementara sales order tetap dihitung dari order rows sehingga split tidak menggandakan gross/net sales.

**Status: complete (2026-07-21).**
