# U01-00 — Analisis & Keputusan Revisi 01

**Status:** complete (2026-07-21).  
**Sumber:** `docs/update/revisi-01.md`.  
**Depends on:** —  
**Blocks:** U01-01, U01-02, U01-03, U01-04, U01-05.

## Tujuan

Mengunci interpretasi revisi owner sebelum coding, terutama karena beberapa poin terlihat UI-only tetapi berdampak pada audit, laporan Owner, schema order, schema payment, dan idempotency checkout.

## Ringkasan analisis project saat ini

- Stack dan konvensi di `AGENTS.md` sudah dibaca. Karena fase ini **documentation-only**, tidak ada perubahan kode Next.js sehingga guide `node_modules/next/dist/docs/` tidak perlu dibuka pada fase ini; fase coding berikutnya tetap wajib membacanya sebelum mengubah route/component/server action.
- `src/db/schema.ts` sudah memiliki `orders.orderType`, `orders.tableNo`, `orders.status = draft|held|paid|refunded|void`, `orders.cashierId`, dan tabel `payments` dengan banyak baris per `order_id` secara struktur DB. Namun checkout core (`src/lib/order-core.ts`) masih mengasumsikan **sekali checkout = satu payment line penuh**.
- `discounts` sudah ada sebagai master sederhana (`name`, `type`, `value`, `active`), dan `approval_requests.kind = discount` sudah ada untuk jalur approval diskon manual.
- Report Owner (`src/lib/reports-data.ts`) sudah punya payment method, cashier sales, recent orders, dan discount summary, tetapi belum punya breakdown delivery provider, EDC provider, transfer rekening, promo source, dan split-payment composition.
- Prinsip auth/session project tetap berlaku: actor canonical dan audit transaksi berasal dari server session/DB (`users.id`), bukan input teks bebas dari client.

## Keputusan final Revisi 01

### 1. Login: lihat password

- Tambahkan toggle lihat/sembunyikan password di UI login.
- Tidak mengubah better-auth flow, session, cookie, atau error handling login.

### 2. Pilihan nama kasir

**Keputusan MVP Revisi 01: A — hanya menampilkan/menegaskan kasir login saat buka shift/masuk POS.**

- Actor canonical transaksi tetap `session.userId` yang sudah divalidasi server dan disimpan sebagai `orders.cashierId` / `shifts.cashierId`.
- UI boleh menampilkan chip/selector non-editable “Kasir aktif: {nama user login}” agar memenuhi kebutuhan owner untuk melihat nama kasir.
- Tidak ada field teks bebas “nama kasir” pada transaksi.
- Shared terminal memilih kasir dari daftar user (**opsi B**) ditunda sampai ada approval owner/manager dan desain autentikasi ulang/PIN yang jelas. Jika nanti diaktifkan, pilihan kasir wajib FK ke `users.id`, dibatasi outlet/role, dan divalidasi saat open shift/checkout.

### 3. Customer/order context

Field wajib UI:

| Order type | Field | Kewajiban | Catatan |
|---|---|---:|---|
| `dinein` | `tableNo` / nomor meja | Wajib | Mengubah default Phase 0 lama: nomor meja kini wajib untuk dine-in pada UI dan validasi server. |
| `dinein` | `customerName` / nama pemesan | Opsional, strongly prompted | Simpan snapshot agar dapur/struk mudah membaca. |
| `takeaway` | `customerName` / nama pemesan | Wajib | Dibutuhkan owner agar order take away bisa dipanggil/diambil. |
| `delivery` | `deliveryProvider` | Wajib | Nilai: `gofood`, `grabfood`, `shopeefood`. |
| `delivery` | `channelOrderName` / penamaan transaksi marketplace | Wajib | Bisa berisi nama customer atau kode transaksi dari aplikasi. |

Validasi server harus trim string, limit panjang, dan menolak kombinasi invalid, misalnya `deliveryProvider` pada dine-in/takeaway.

### 4. Simpan Order / held order

- Label tombol **“Tahan” diganti menjadi “Simpan Order”**.
- Perubahan bukan UI-only: aksi harus benar-benar membuat/menyimpan order `status = held` di DB beserta item dan context pesanan.
- Resume held order wajib memuat kembali item + context pesanan, lalu checkout harus mengubah order yang sama dari `held` menjadi `paid` dalam transaksi DB.
- Held order tidak boleh membuat kitchen ticket, payment, atau stock deduction sebelum payment sukses.
- Idempotency checkout tetap wajib: retry checkout held order tidak boleh membuat payment/kitchen ticket ganda.

### 5. Promo

**Keputusan MVP Revisi 01: promo predefined/seeded + approval manager untuk manual discount.**

- Tombol promosi di halaman pemesanan membuka selector promo aktif dari DB.
- Kasir boleh menerapkan promo yang sudah aktif dan valid; nominal diskon tetap dihitung ulang server dari rule promo, bukan dari nominal client.
- Manual discount/ad-hoc tetap harus melalui `approval_requests.kind = discount` dan audit.
- Master `discounts` saat ini boleh dipakai untuk MVP sederhana; fase berikutnya boleh menambah field rule bila diperlukan untuk eligibility dan report.

### 6. Payment detail dan split payment

Keputusan Phase 0 lama “split payment bukan MVP” **dibatalkan khusus Revisi 01**. Split payment masuk scope update.

- Satu order boleh punya banyak `payments` sukses/pending sesuai payment lines.
- Checkout dianggap lunas hanya jika total payment line sukses = `orders.total`.
- Setiap line punya method/group, provider/detail, amount, reference, dan idempotency key line-level.
- Satu request checkout split juga butuh request-level idempotency/guard agar retry tidak menggandakan seluruh kumpulan payment line.
- Cash line boleh punya `cashReceived` dan `changeAmount`; non-cash tidak boleh menghasilkan kembalian.
- Jika ada cash dalam split, perubahan/kembalian dihitung hanya dari cash line dan harus tetap membuat total tendered valid tanpa overpay tak terkontrol.

### 7. Owner reporting impact

Report Owner yang terdampak dan wajib disiapkan di U01-05:

- Sales by order type: dine-in, take away, delivery.
- Delivery breakdown: GoFood, GrabFood, ShopeeFood.
- Payment breakdown: cash, QRIS, e-wallet, card/EDC, transfer.
- EDC breakdown: EDC BCA, EDC Mandiri, EDC BCA Lainnya, EDC Mandiri Lainnya.
- Transfer breakdown: rekening/bank tujuan dan reference number availability.
- Split payment: order count split vs single, komposisi method per order, dan total per line tanpa double-count order gross sales.
- Promo/discount: promo predefined vs manual approved discount, discount amount, dan approver bila manual.
- Cashier sales: tetap berdasarkan `orders.cashierId` canonical dari session/shift.

## Mapping field final untuk migration order/payment

### `orders`

| Field | Tipe DB rekomendasi | Null | Dipakai untuk | Validasi |
|---|---|---:|---|---|
| `customer_name` | `text` | Ya | Nama pemesan dine-in/takeaway snapshot | Trim, max 80; wajib untuk takeaway. |
| `delivery_provider` | `text` enum-ish | Ya | Provider ojek online | Hanya `gofood|grabfood|shopeefood`; wajib jika `order_type=delivery`, null selain delivery. |
| `channel_order_name` | `text` | Ya | Nama/kode transaksi marketplace | Trim, max 120; wajib jika delivery, null/opsional selain delivery. |
| `discount_id` | `text` FK `discounts.id` | Ya | Promo predefined yang diterapkan | Harus aktif/eligible saat apply. |
| `discount_approval_id` | `text` FK `approval_requests.id` | Ya | Manual discount approved | Wajib jika diskon manual/ad-hoc. |
| `discount_note` | `text` | Ya | Snapshot nama/rule promo untuk audit/report | Diisi server. |

Catatan: `orders.table_no` sudah ada dan sekarang wajib secara validasi untuk dine-in. `orders.customer_id` tetap opsional untuk CRM, bukan pengganti `customer_name` snapshot.

### `payments`

| Field | Tipe DB rekomendasi | Null | Dipakai untuk | Validasi |
|---|---|---:|---|---|
| `method` | enum diperluas | Tidak | Group laporan utama | Tambahkan `card`; pertahankan `cash|qris|transfer|ewallet`. |
| `provider` | `text` enum-ish | Ya | Detail channel | Card: `edc_bca|edc_mandiri|edc_bca_lainnya|edc_mandiri_lainnya`; transfer: bank/rekening tujuan. |
| `account_name` | `text` | Ya | Nama rekening/terminal tujuan | Opsional untuk EDC, direkomendasikan untuk transfer. |
| `reference_no` | `text` | Ya | Approval code/nomor referensi | Strongly prompted untuk non-cash. |
| `line_no` | `integer` | Tidak | Urutan split payment | Unique per order bila memungkinkan. |
| `request_idempotency_key` | `text` | Ya | Idempotency satu checkout request split | Sama untuk semua line dalam satu request. |
| `idempotency_key` | `text` unique | Tidak | Idempotency per payment line | Tetap unique. |

Catatan: `payments.order_id` saat ini tidak unique sehingga sudah kompatibel untuk multiple lines. Perlu constraint/test tambahan agar jumlah line sukses tidak melebihi/kurang dari total saat order ditandai `paid`.

### Opsi payment method UI

| UI owner | `method` | `provider` |
|---|---|---|
| Tunai | `cash` | null |
| QRIS | `qris` | provider QRIS bila nanti ada; null untuk MVP |
| E-Wallet | `ewallet` | provider e-wallet bila nanti ada; null untuk MVP |
| Non Tunai > Kartu > EDC BCA | `card` | `edc_bca` |
| Non Tunai > Kartu > EDC Mandiri | `card` | `edc_mandiri` |
| Non Tunai > Kartu > EDC BCA Lainnya | `card` | `edc_bca_lainnya` |
| Non Tunai > Kartu > EDC Mandiri Lainnya | `card` | `edc_mandiri_lainnya` |
| Transfer Rekening | `transfer` | bank/rekening tujuan, seed awal minimal `bca` dan `mandiri` bila rekening usaha tersedia |

## Daftar skenario UAT owner/kasir

1. **Login password reveal:** kasir membuka `/login`, mengetik password, toggle “Tampilkan password”, toggle kembali, lalu login berhasil/gagal tetap sama.
2. **Kasir aktif:** setelah login sebagai kasir, `/kasir` menampilkan nama kasir dari session; user tidak bisa mengubahnya menjadi teks bebas.
3. **Dine-in wajib nomor meja:** checkout dine-in tanpa nomor meja ditolak; dengan nomor meja + nama pemesan tersimpan dan muncul di receipt/kitchen context.
4. **Take away wajib nama pemesan:** checkout take away tanpa nama ditolak; dengan nama tersimpan dan muncul di receipt.
5. **Delivery provider:** delivery mewajibkan provider GoFood/GrabFood/ShopeeFood dan nama transaksi; kombinasi provider pada dine-in ditolak server.
6. **Simpan Order:** kasir membuat cart, mengisi context, klik “Simpan Order”; order masuk daftar tersimpan sebagai `held`, tidak ada payment/kitchen ticket/stock deduction.
7. **Resume Simpan Order:** kasir membuka order tersimpan, item/context kembali utuh, lalu checkout sukses mengubah order menjadi `paid` tanpa duplikasi order.
8. **Promo predefined:** kasir memilih promo aktif; server menghitung diskon sesuai rule; report menandai diskon sebagai promo.
9. **Manual discount approval:** kasir mencoba diskon manual; harus ada approval Manager/Owner dan audit sebelum bisa mengurangi total.
10. **EDC BCA/Mandiri:** bayar full dengan masing-masing opsi EDC; payment tersimpan `method=card` dengan provider yang benar dan report breakdown cocok.
11. **Transfer rekening:** bayar full dengan transfer, rekening/reference tersimpan dan tampil pada receipt/report payment detail.
12. **Split payment cash + EDC:** satu order dibayar sebagian tunai dan sebagian EDC; total line = total order, kembalian hanya dari cash line, report payment menjumlah per line tanpa menggandakan gross sales.
13. **Split payment transfer + EDC:** non-cash split memerlukan amount/reference per line dan order paid hanya jika total sukses sama dengan total order.
14. **Idempotency retry:** klik bayar/retry request split yang sama tidak membuat payment lines atau kitchen ticket ganda.
15. **Owner report:** Owner melihat breakdown provider delivery, EDC, transfer, promo/discount, split vs single, dan cashier sales sesuai data transaksi.

## Dampak ke dokumen keputusan project

Keputusan Phase 0 yang disupersede oleh Revisi 01:

| Keputusan lama | Keputusan baru Revisi 01 |
|---|---|
| Dine-in nomor meja opsional | Nomor meja wajib untuk dine-in di UI dan validasi server. |
| Split payment bukan MVP | Split payment masuk scope Revisi 01. |
| Marketplace hanya type badge GoFood/Grab | Delivery provider structured: GoFood, GrabFood, ShopeeFood + nama/kode transaksi marketplace. |
| Kasir boleh apply predefined discount; manual manager-gated | Tetap berlaku, ditambah tombol promo dan kebutuhan report promo source. |

## Acceptance criteria

- [x] Tidak ada ambiguitas data untuk 10 poin revisi.
- [x] Keputusan tidak melanggar prinsip auth/session: server tetap authoritative.
- [x] Laporan Owner yang terdampak sudah disebut jelas sebelum coding.

## Definition of Done

- [x] Update dokumen keputusan project untuk interpretasi Revisi 01 tercatat di fase ini.
- [x] Mapping field final untuk migration order/payment tercatat.
- [x] Daftar skenario UAT owner/kasir tercatat.
- [x] Konfirmasi pilihan nama kasir: **A — menampilkan/menegaskan kasir login saat buka shift/POS**.

**Status: complete (2026-07-21).** U01-01 sampai U01-05 boleh dimulai dengan keputusan di atas sebagai kontrak implementasi.
