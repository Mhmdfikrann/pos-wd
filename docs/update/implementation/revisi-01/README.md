# Implementasi Update Revisi 01 — Owner/Kasir

> Sumber update owner: [`docs/update/revisi-01.md`](../../revisi-01.md).  
> Folder ini memecah revisi tersebut menjadi fase implementasi yang bisa dikerjakan bertahap tanpa mencampur scope.

## Ringkasan analisis

Revisi 01 hampir seluruhnya menyentuh **alur Kasir/POS** dan sebagian kecil **Login**. Dampaknya tidak hanya UI: beberapa poin perlu perluasan data order dan payment supaya laporan Owner tetap akurat.

Update owner berisi 10 poin:

| # | Permintaan owner | Area | Dampak utama |
|---|---|---|---|
| 1 | Login ditambahkan fitur lihat password | Login | UI-only, aman jika tidak mengubah auth flow better-auth. |
| 2 | Masukan pilihan nama kasir | Login/Kasir/Shift | Perlu keputusan: kasir aktif tetap harus berasal dari session user, pilihan nama kasir hanya boleh memilih user valid/shift actor yang diaudit. |
| 3 | Pilihan Ojek online GoFood/GrabFood/ShopeeFood + kolom penamaan transaksi | Kasir order metadata | Delivery perlu sub-channel dan nama/order label marketplace. |
| 4 | Pesanan Meja tambah nama pemesan dan nomor meja | Kasir order metadata | `tableNo` sudah ada; nama pemesan perlu disimpan sebagai customer/order label. |
| 5 | Take away tambah nama pemesan | Kasir order metadata | Nama pemesan wajib/opsional sesuai keputusan fase. |
| 6 | Tombol Tahan diganti Simpan Order | Kasir held order | Renaming UI + implementasi hold/resume yang sebelumnya belum shipped. |
| 7 | Tombol promosi di halaman pemesanan menu | Kasir discount/promo | Perlu promo selector dan guard diskon; jangan percaya diskon dari client. |
| 8 | Bayar: Non Tunai > Kartu > EDC BCA/Mandiri/BCA Lainnya/Mandiri Lainnya | Payment | Perlu payment channel/detail lebih granular dari enum saat ini. |
| 9 | Bayar: Transfer Rekening | Payment | Perlu pilihan transfer bank/account/reference. |
| 10 | Bayar: fitur pisah bayar | Payment | Mengubah keputusan Phase 0 lama: split payment kini masuk scope update. |

## Keputusan awal yang direkomendasikan

1. **Actor kasir canonical tetap `session.userId`** untuk audit, RBAC, dan shift. Jika owner minta “pilihan nama kasir”, implementasikan sebagai pilihan user kasir saat login/shift hanya jika memang ada use case shared device. Jangan membuat transaksi bisa mengaku sebagai kasir lain tanpa autentikasi/permission.
2. **Nama pemesan disimpan terpisah dari `tableNo`.** Rekomendasi migration: tambah `orders.customer_name` dan `orders.channel_detail`/`orders.channel_order_name` daripada memaksa masuk ke `note`.
3. **Delivery channel:** `orders.orderType = delivery`, dengan `deliveryProvider = gofood|grabfood|shopeefood` dan `channelOrderName` untuk penamaan transaksi.
4. **Payment method tetap ringkas untuk laporan, detail disimpan sebagai channel.** Contoh: `payments.method = card|transfer|cash|qris|ewallet`, `payments.provider = edc_bca|edc_mandiri|edc_bca_lainnya|edc_mandiri_lainnya|bank_transfer`.
5. **Split payment perlu tabel/semantik yang jelas.** Saat ini `payments.order_id` boleh banyak baris, tapi checkout core mengasumsikan satu payment sebesar total. Update harus mengizinkan beberapa baris payment dengan total amount = order total.
6. **Promo/diskon harus server-authoritative.** Tombol promosi boleh UI, tetapi nominal diskon harus berasal dari aturan promo DB/permission manager, bukan angka bebas dari client.

## Keputusan U01-00 yang sudah dikunci

Detail penuh ada di [`phase-u01-00-analysis-decisions.md`](phase-u01-00-analysis-decisions.md). Ringkasannya:

- Pilihan nama kasir memakai **opsi A**: tampilkan/konfirmasi kasir login; actor transaksi tetap `session.userId`/`users.id`.
- Dine-in wajib nomor meja; take away wajib nama pemesan; delivery wajib provider (`gofood`, `grabfood`, `shopeefood`) dan nama/kode transaksi marketplace.
- “Simpan Order” harus menyimpan `orders.status = held` ke DB, bukan rename tombol saja.
- Promo MVP memakai promo predefined/seeded; diskon manual tetap approval Manager/Owner.
- Split payment masuk scope Revisi 01 dengan multiple payment lines per order.
- Owner report harus menambah breakdown delivery provider, EDC provider, transfer, split, promo/discount, dan cashier.

## Peta fase update

| Fase | File | Fokus | Bergantung pada |
|------|------|-------|-----------------|
| U01-00 | [`phase-u01-00-analysis-decisions.md`](phase-u01-00-analysis-decisions.md) | **Complete** — keputusan data, UX, laporan, mapping migration, dan UAT Revisi 01 | — |
| U01-01 | [`phase-u01-01-login-cashier-picker.md`](phase-u01-01-login-cashier-picker.md) | Lihat password + pilihan nama kasir yang aman | U01-00 |
| U01-02 | [`phase-u01-02-order-context-fields.md`](phase-u01-02-order-context-fields.md) | Nama pemesan, nomor meja, delivery provider, penamaan transaksi | U01-00 |
| U01-03 | [`phase-u01-03-save-order-and-promo.md`](phase-u01-03-save-order-and-promo.md) | Ganti Tahan → Simpan Order, hold/resume, tombol promosi | U01-02 |
| U01-04 | [`phase-u01-04-payment-methods-split.md`](phase-u01-04-payment-methods-split.md) | EDC, transfer rekening, split payment | U01-02 |
| U01-05 | [`phase-u01-05-owner-reporting-uat.md`](phase-u01-05-owner-reporting-uat.md) | Penyesuaian laporan Owner, audit, UAT skenario owner/kasir | U01-03, U01-04 |

## Dependency graph

```text
U01-00
  ├─▶ U01-01
  └─▶ U01-02 ─┬─▶ U01-03 ─┐
              └─▶ U01-04 ─┴─▶ U01-05
```

## Catatan untuk coding agent

- Tetap baca [`AGENTS.md`](../../../../AGENTS.md) dan, sebelum mengubah kode Next.js, baca guide relevan di `node_modules/next/dist/docs/` sesuai aturan project.
- Revisi ini menyentuh Phase 2 (login/auth), Phase 5 (POS/payment), Phase 9 (discount/approval), dan Phase 10 (reports). Jangan mengubah flow di luar file fase yang sedang dikerjakan.
- Mockup visual lama di `docs/*.dc.html` tetap baseline fidelity, tetapi revisi owner ini menjadi override untuk area yang disebut eksplisit.
- Semua nominal uang integer rupiah; format memakai `formatRupiah`.
- Semua action order/payment tetap harus server-side, outlet-scoped, shift-scoped, idempotent, dan audited.
