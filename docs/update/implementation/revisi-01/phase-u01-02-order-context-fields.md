# U01-02 — Kasir: Order Context Fields

**Status:** complete (2026-07-21).  
**Update refs:** revisi-01 poin 3–5.  
**Depends on:** U01-00.  
**Blocks:** U01-03, U01-04, U01-05.

## Tujuan

Menambahkan informasi konteks pesanan di UI Kasir dan menyimpannya secara structured agar dapur, struk, dan laporan Owner bisa membaca data yang sama.

## Permintaan owner

- Ojek online: pilihan GoFood, GrabFood, ShopeeFood + kolom penamaan transaksi.
- Pesanan meja: nama pemesan + nomor meja.
- Take away: nama pemesan.

## Kondisi saat ini

- `orders.orderType` sudah ada: `dinein | takeaway | delivery`.
- `orders.tableNo` sudah ada.
- `orders.customerId` ada, tetapi UI belum menginput customer.
- `orders.note` ada, tetapi tidak ideal untuk data laporan.
- `src/app/kasir/KasirClient.tsx` sudah punya state `orderType`, tetapi field order context belum lengkap.

## Scope UI

1. Dine-in
   - Field nomor meja.
   - Field nama pemesan.
   - Tampilkan ringkasan di cart dan receipt.

2. Take away
   - Field nama pemesan.
   - Tampilkan ringkasan di cart dan receipt.

3. Ojek online / delivery
   - Selector provider: GoFood, GrabFood, ShopeeFood.
   - Field penamaan transaksi/order name marketplace.
   - Tampilkan provider + nama transaksi di cart, kitchen ticket, receipt.

## Scope backend/data

Rekomendasi migration:

- Tambah kolom di `orders`:
  - `customer_name text` untuk nama pemesan snapshot.
  - `delivery_provider text` enum-ish: `gofood | grabfood | shopeefood | null`.
  - `channel_order_name text` untuk penamaan transaksi dari marketplace.
- Atau, bila ingin lebih extensible: `order_channel text` dan `order_channel_detail text`, tetapi tetap typed di service.

Service/action:

- Extend `CheckoutInput` dan `CheckoutRequest` dengan field context.
- Validasi server-side:
  - `deliveryProvider` hanya boleh terisi saat `orderType = delivery`.
  - `tableNo` hanya relevan saat `orderType = dinein`.
  - Trim string, limit panjang, dan hindari data kosong/spasi.

## Non-scope

- CRM customer detail lengkap belum perlu.
- Integrasi API marketplace belum perlu; provider hanya metadata transaksi.

## Acceptance criteria

- [x] Dine-in bisa mengisi nomor meja dan nama pemesan.
- [x] Take away bisa mengisi nama pemesan.
- [x] Delivery bisa memilih GoFood/GrabFood/ShopeeFood dan mengisi nama transaksi.
- [x] Data tersimpan structured di DB, tidak hanya di UI state.
- [x] Receipt dan kitchen ticket menampilkan konteks yang membantu operasional.
- [x] Reports bisa membedakan dine-in/takeaway/delivery provider.

## Test/verification

- Integration test checkout dengan tiap order type.
- Validasi server menolak kombinasi invalid, misalnya provider delivery pada dine-in.
- Manual render `/kasir`: field muncul/hilang sesuai order type.


## Implementation notes

- `orders` ditambah kolom structured context: `customer_name`, `delivery_provider`, dan `channel_order_name` melalui migration `drizzle/0006_romantic_true_believers.sql`.
- `CheckoutRequest`/`CheckoutInput` sekarang membawa context pesanan, lalu service checkout men-trim, membatasi panjang, dan memvalidasi kombinasi server-side:
  - dine-in wajib `tableNo`, `customerName` opsional; delivery fields ditolak.
  - take away wajib `customerName`; meja/delivery fields ditolak.
  - delivery wajib provider `gofood|grabfood|shopeefood` dan `channelOrderName`; meja ditolak.
- UI `/kasir` menampilkan field yang berubah sesuai order type, ringkasan konteks di cart, dan konteks di modal receipt sukses.
- Kitchen ticket membawa `contextLabel` dari DB dan menampilkan meja/nama pemesan/provider marketplace.
- Owner recent orders membedakan delivery provider di meta transaksi agar report bisa mulai memisahkan provider.

**Status: complete (2026-07-21).**
