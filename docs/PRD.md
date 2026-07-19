# Product Requirements Document (PRD)
# Wanna Dimsum POS

**Status Dokumen:** Draft  
**Versi:** 1.1  
**Jenis Produk:** Internal Point of Sale System  
**Platform Utama:** Responsive Web Application  
**Tech Stack:** Next.js, Tailwind CSS, shadcn/ui, Drizzle ORM, SQLite

**Perubahan versi 1.1:** Menambahkan Lampiran A — Referensi Mockup, yang mendokumentasikan empat layar prototipe yang telah dibuat (Owner Dashboard, Kasir, Kitchen Display, dan Inventori) beserta pemetaannya ke requirement pada dokumen ini.

**Perubahan versi 1.2:** Owner Dashboard diperluas menjadi satu file dengan routing internal sehingga seluruh menu/sub-menu sidebar memiliki halaman (via mesin halaman berbasis arketipe: daftar, laporan, form, board). Lihat Lampiran A.1.

---

## 1. Ringkasan Produk

Wanna Dimsum POS adalah aplikasi Point of Sale internal yang digunakan untuk mengelola penjualan, pembayaran, pesanan dapur, shift kasir, pergerakan uang kas, stok bahan baku, resep produk, dan laporan operasional dalam satu sistem terintegrasi.

Aplikasi dirancang agar cepat digunakan saat antrean ramai, mudah dipahami oleh kasir baru, aman untuk transaksi finansial, serta mampu memberikan laporan yang akurat kepada manager dan owner.

---

## 2. Product Vision

Membangun sistem POS internal yang sederhana bagi pengguna operasional, cepat dalam memproses pesanan, akurat dalam mencatat transaksi dan stok, serta memberikan visibilitas bisnis kepada owner tanpa bergantung pada rekap manual.

Wanna Dimsum POS menjadi pusat operasional digital yang menghubungkan:

- Kasir
- Tim dapur
- Manager outlet
- Staf inventory
- Owner

---

## 3. Latar Belakang dan Permasalahan

Tanpa sistem terintegrasi, operasional Wanna Dimsum berpotensi mengalami:

- Kesalahan input menu, jumlah, varian, atau add-on.
- Pesanan terlambat atau salah diteruskan ke dapur.
- Kesulitan mencocokkan uang kas dengan transaksi.
- Diskon, void, dan refund yang sulit ditelusuri.
- Stok bahan baku yang tidak mengikuti penjualan secara otomatis.
- Laporan yang masih memerlukan rekap manual.
- Sulit mengetahui produk terlaris dan jam penjualan tertinggi.
- Tidak adanya jejak audit untuk perubahan transaksi, kas, dan stok.

Wanna Dimsum POS dibangun untuk menyelesaikan masalah tersebut melalui sistem yang terpusat, konsisten, dan dapat diaudit.

---

## 4. Tujuan Produk

### 4.1 Tujuan Utama

1. Mempercepat proses input dan pembayaran pesanan.
2. Mengurangi kesalahan komunikasi antara kasir dan dapur.
3. Menjamin pencatatan transaksi yang akurat dan dapat ditelusuri.
4. Mengontrol uang kas berdasarkan shift kasir.
5. Mengurangi stok otomatis berdasarkan resep produk.
6. Menyediakan dashboard dan laporan untuk owner dan manager.
7. Menyiapkan fondasi sistem yang mendukung multi-outlet.

### 4.2 Tujuan Pendukung

1. Mengetahui produk terlaris dan kurang laku.
2. Mengetahui jam penjualan tertinggi.
3. Memantau pengeluaran operasional outlet.
4. Memantau refund, void, diskon, dan selisih kas.
5. Mengurangi ketergantungan terhadap pencatatan manual.

---

## 5. Non-Goals

Fitur berikut tidak menjadi fokus MVP:

- Integrasi GoFood, GrabFood, dan ShopeeFood.
- Dynamic QRIS atau payment gateway otomatis.
- Sistem akuntansi penuh.
- Payroll karyawan.
- Loyalty point dan membership.
- Franchise management.
- Aplikasi mobile native.
- AI forecasting.
- Full offline-first system.
- Sinkronisasi marketplace otomatis.
- Integrasi ERP eksternal.

---

## 6. Target Pengguna

### 6.1 Owner

**Kebutuhan:**

- Melihat omzet, jumlah transaksi, dan average order value.
- Melihat performa produk dan kategori.
- Melihat selisih kas setiap shift.
- Memantau refund, void, diskon, dan pengeluaran.
- Melihat stok rendah dan laporan seluruh outlet.

**Hak akses:**

- Akses penuh ke seluruh modul dan outlet.
- Mengelola pengguna, role, outlet, produk, harga, dan pengaturan.
- Menyetujui tindakan sensitif tertentu.
- Melihat audit log.

### 6.2 Manager Outlet

**Kebutuhan:**

- Memantau operasional outlet.
- Mengelola shift dan uang kas.
- Menyetujui refund, void, diskon, dan penyesuaian stok.
- Memantau kitchen queue dan stok outlet.

**Hak akses:**

- Hanya mengakses outlet yang ditugaskan.
- Mengelola shift, inventory, pengeluaran, dan laporan outlet.
- Menyetujui tindakan operasional sesuai permission.

### 6.3 Kasir

**Kebutuhan:**

- Membuka shift.
- Memasukkan pesanan dengan cepat.
- Menerima pembayaran dan menghitung uang kembali.
- Mencetak struk.
- Menahan dan melanjutkan pesanan.
- Menutup shift.

**Hak akses:**

- Membuat transaksi pada outlet dan shift aktif.
- Menerima pembayaran.
- Mencetak ulang struk.
- Mengajukan refund atau void.
- Tidak dapat mengubah harga dasar atau mengakses outlet lain.

### 6.4 Tim Dapur

**Kebutuhan:**

- Melihat antrean pesanan.
- Membaca catatan item.
- Mengetahui waktu tunggu.
- Mengubah status produksi.

**Hak akses:**

- Melihat kitchen ticket outlet.
- Mengubah status pesanan sesuai alur yang valid.

### 6.5 Staf Inventory

**Kebutuhan:**

- Melihat stok saat ini.
- Mencatat stok masuk, keluar, adjustment, dan waste.
- Melakukan stock opname.
- Melihat histori pergerakan stok.

**Hak akses:**

- Mengelola inventory outlet.
- Tidak dapat mengubah transaksi penjualan atau data finansial.

---

## 7. Jobs to Be Done

### Kasir

> Saat pelanggan memesan, saya ingin memasukkan pesanan dengan cepat agar antrean tidak menumpuk.

> Saat pelanggan membayar, saya ingin total dan uang kembali dihitung otomatis agar tidak terjadi kesalahan.

### Tim Dapur

> Saat pesanan telah dibayar, saya ingin pesanan langsung muncul di layar dapur agar dapat segera diproses.

### Manager

> Saat shift ditutup, saya ingin mengetahui uang kas seharusnya dan uang kas aktual agar selisih dapat ditelusuri.

### Inventory

> Saat produk terjual, saya ingin stok bahan berkurang berdasarkan resep agar jumlah stok lebih akurat.

### Owner

> Saat membuka dashboard, saya ingin melihat kondisi bisnis tanpa harus meminta rekap manual.

---

## 8. Ruang Lingkup MVP

### 8.1 Authentication dan Access Control

- Login menggunakan email/username dan password.
- PIN kasir untuk akses cepat.
- Role-based access control.
- Pembatasan akses berdasarkan outlet.
- Aktivasi dan deaktivasi akun.
- Logout dan session management.

### 8.2 Outlet Management

- Nama, kode, alamat, dan kontak outlet.
- Jam operasional.
- Mata uang dan timezone.
- Pengaturan pajak dan service charge.
- Pengaturan printer.
- Status aktif atau tidak aktif.

### 8.3 Product Catalog

- Category.
- Product.
- Variant.
- Add-on.
- SKU.
- Harga dan cost price.
- Foto produk.
- Availability.
- Kitchen station.

### 8.4 Point of Sale

- Product search.
- Category filter.
- Shopping cart.
- Quantity.
- Variant dan add-on.
- Catatan item dan pesanan.
- Dine-in.
- Takeaway.
- Delivery manual.
- Hold dan resume order.
- Checkout.
- Receipt.

### 8.5 Payment

- Cash.
- QRIS manual.
- Transfer bank.
- E-wallet manual.
- Nomor referensi pembayaran.
- Perhitungan uang kembali.
- Payment status.
- Proteksi duplicate submission.

### 8.6 Kitchen Display System

- New.
- Accepted.
- Preparing.
- Ready.
- Completed.
- Cancelled.
- Timer pesanan.
- Catatan item.
- Real-time atau short polling.

### 8.7 Shift dan Cash Management

- Open shift.
- Opening cash.
- Active shift.
- Cash in dan cash out.
- Operational expense.
- Close shift.
- Expected cash.
- Actual cash.
- Cash difference.
- Closing notes.
- Manager approval.

### 8.8 Inventory dan Recipe

- Inventory item.
- Outlet stock.
- Stock movement.
- Recipe dan recipe item.
- Automatic stock deduction.
- Minimum stock.
- Manual stock adjustment.
- Stock movement history.

### 8.9 Reporting

- Daily dan monthly sales.
- Sales by product.
- Sales by category.
- Sales by cashier.
- Sales by payment method.
- Shift reconciliation.
- Current inventory.
- Refund, void, discount, dan expense.

### 8.10 Audit

- Login.
- Perubahan harga.
- Refund.
- Void.
- Diskon manual.
- Stock adjustment.
- Cash adjustment.
- Role dan permission changes.

---

## 9. Post-MVP Scope

- Supplier.
- Purchase order.
- Stock opname.
- Waste management.
- Customer database.
- Digital receipt.
- Split payment.
- Split bill.
- Voucher dan loyalty.
- Offline order queue.
- Transfer stok antar-outlet.
- Marketplace integration.

---

## 10. Core User Flows

### 10.1 Open Shift

1. Kasir login.
2. Kasir memilih outlet.
3. Kasir membuka shift.
4. Kasir memasukkan opening cash.
5. Sistem membuat shift aktif.
6. Kasir dapat menerima transaksi.

**Acceptance criteria:**

- Kasir hanya memiliki satu shift aktif per outlet.
- Pembayaran ditolak jika tidak ada shift aktif.
- Opening cash tidak boleh negatif.
- Aktivitas open shift dicatat.

### 10.2 Create and Pay Order

1. Kasir memilih produk.
2. Kasir memilih variant dan add-on.
3. Kasir menambahkan catatan bila diperlukan.
4. Sistem menghitung subtotal dan total.
5. Kasir memilih tipe pesanan.
6. Kasir memilih metode pembayaran.
7. Sistem menyimpan order dan payment.
8. Kitchen ticket dibuat.
9. Stok dikurangi berdasarkan recipe.
10. Struk tersedia.

**Acceptance criteria:**

- Total dihitung dengan benar.
- Payment ganda dapat dicegah.
- Order item menyimpan snapshot produk dan harga.
- Checkout diproses dalam database transaction.
- Kitchen ticket dan stock movement dibuat tepat satu kali.
- Order paid tidak dapat dibayar ulang.

### 10.3 Kitchen Processing

1. Paid order muncul di layar dapur.
2. Dapur menerima pesanan.
3. Status berubah menjadi preparing.
4. Setelah selesai, status berubah menjadi ready.
5. Setelah diserahkan, status menjadi completed.

**Acceptance criteria:**

- Pesanan hanya tampil pada outlet yang sesuai.
- Setiap perubahan status memiliki actor dan timestamp.
- Invalid state transition ditolak.
- Kitchen ticket tidak tampil ganda.

### 10.4 Close Shift

1. Kasir memilih close shift.
2. Sistem menghitung expected cash.
3. Kasir memasukkan actual cash.
4. Sistem menghitung difference.
5. Kasir menambahkan catatan.
6. Manager menyetujui jika diperlukan.
7. Shift ditutup.

**Acceptance criteria:**

- Transaksi baru ditolak setelah shift closed.
- Cash payment, cash refund, cash in, dan cash out diperhitungkan.
- Selisih kas wajib memiliki catatan.
- Shift yang ditutup tidak dapat diedit oleh kasir.

### 10.5 Refund

1. Pengguna memilih transaksi.
2. Memilih item atau nominal refund.
3. Mengisi alasan.
4. Manager melakukan approval.
5. Sistem mencatat refund.
6. Laporan diperbarui.
7. Stok dikembalikan hanya jika aturan memungkinkan.

**Acceptance criteria:**

- Refund tidak melebihi jumlah yang telah dibayar.
- Refund memiliki actor, reason, dan approval.
- Histori transaksi asli tetap tersedia.
- Refund masuk audit log.

---

## 11. Functional Requirements

| ID | Requirement |
|---|---|
| FR-001 | Sistem menyediakan login dan session yang aman. |
| FR-002 | Sistem membatasi akses berdasarkan role dan outlet. |
| FR-003 | Admin dapat mengelola category, product, variant, add-on, price, dan availability. |
| FR-004 | Kasir dapat menambahkan, mengubah, dan menghapus item pada cart. |
| FR-005 | Sistem membuat order dengan nomor unik, outlet, shift, dan cashier. |
| FR-006 | Sistem mencatat payment dan mencegah duplicate payment. |
| FR-007 | Sistem menyediakan receipt yang dapat dicetak ulang. |
| FR-008 | Paid order diteruskan ke kitchen queue. |
| FR-009 | Sistem mencatat opening cash, expected cash, actual cash, dan difference. |
| FR-010 | Sistem mencatat cash in, cash out, expense, dan adjustment. |
| FR-011 | Sistem menyimpan stock dan histori stock movement. |
| FR-012 | Sistem menghubungkan product atau variant dengan recipe. |
| FR-013 | Sistem mengurangi stok otomatis setelah payment berhasil. |
| FR-014 | Sistem mendukung refund dan void dengan permission dan audit. |
| FR-015 | Sistem menyediakan laporan berdasarkan date range dan outlet. |
| FR-016 | Sistem mencatat tindakan sensitif pada audit log. |

---

## 12. Business Rules

| ID | Rule |
|---|---|
| BR-001 | Setiap transaksi wajib memiliki outlet, shift, cashier, dan nomor transaksi unik. |
| BR-002 | Seluruh nilai rupiah disimpan sebagai integer, bukan floating-point. |
| BR-003 | Payment wajib menggunakan idempotency key. |
| BR-004 | Order item menyimpan snapshot nama, SKU, variant, price, dan cost. |
| BR-005 | Financial record tidak boleh dihapus permanen. |
| BR-006 | Setiap perubahan stok wajib melalui stock movement ledger. |
| BR-007 | Checkout menggunakan database transaction. |
| BR-008 | Payment membutuhkan shift berstatus open. |
| BR-009 | Refund tidak boleh melebihi paid amount yang belum direfund. |
| BR-010 | Akses data wajib dibatasi berdasarkan outlet pada server. |
| BR-011 | Refund, void, diskon, cash adjustment, dan stock adjustment wajib diaudit. |
| BR-012 | Master data menggunakan soft delete atau inactive status. |
| BR-013 | Stok dikurangi setelah payment berhasil. |
| BR-014 | Negative stock tidak diizinkan pada alur normal. |
| BR-015 | Order dikirim ke dapur setelah payment berhasil. |

---

## 13. Non-Functional Requirements

### 13.1 Performance

- POS page terbuka kurang dari 3 detik.
- Add-to-cart terasa instan.
- Checkout selesai kurang dari 2 detik pada koneksi normal.
- Kitchen ticket muncul kurang dari 3 detik.
- Laporan harian terbuka kurang dari 5 detik.

### 13.2 Reliability

- Payment tidak boleh tercatat dua kali.
- Stock movement tidak boleh diposting dua kali.
- Checkout gagal harus rollback secara penuh.
- Backup database dilakukan otomatis.

### 13.3 Security

- Password dan PIN disimpan sebagai hash.
- Session menggunakan secure HTTP-only cookie.
- Authorization dilakukan di server.
- Input divalidasi.
- Secret tidak disimpan dalam repository.
- Aktivitas sensitif dicatat.

### 13.4 Scalability

- Sistem mendukung multi-outlet sejak desain awal.
- Domain dan business logic tidak bergantung langsung pada SQLite.
- Migrasi ke PostgreSQL harus tetap memungkinkan bila skala meningkat.

### 13.5 Usability

- Kasir baru memahami alur transaksi dasar maksimal 15 menit.
- Pembayaran maksimal tiga langkah.
- Tombol utama nyaman digunakan melalui layar sentuh.
- Pesan kesalahan menggunakan bahasa Indonesia yang jelas.

### 13.6 Availability

- Target uptime awal 99,5%.
- Backup harian.
- RPO maksimal 24 jam.
- RTO maksimal 4 jam.

---

## 14. Technical Requirements

### 14.1 Frontend

- Next.js App Router.
- TypeScript strict mode.
- Tailwind CSS.
- shadcn/ui.
- React Hook Form.
- Zod.
- Zustand dapat digunakan untuk cart state.

### 14.2 Backend

- Next.js Route Handlers atau Server Actions.
- Modular monolith.
- Application service layer.
- Server-side authorization.
- Database transaction untuk operasi kritis.

### 14.3 Database

- SQLite.
- Drizzle ORM.
- Drizzle migrations.
- Foreign key enabled.
- Write-Ahead Logging.
- Persistent storage.
- Daily backup.

### 14.4 Deployment

- VPS atau Node.js server.
- Persistent disk.
- PM2 atau Docker.
- HTTPS.
- Structured logging.
- Error monitoring.

### 14.5 Real-Time

- Server-Sent Events sebagai opsi utama.
- Short polling sebagai fallback.
- Real-time implementation dibungkus dalam adapter.

---

## 15. Data Model Summary

Entity utama:

- User
- Role
- Permission
- Outlet
- Category
- Product
- Product Variant
- Add-on
- Customer
- Order
- Order Item
- Payment
- Refund
- Shift
- Cash Movement
- Kitchen Ticket
- Inventory Item
- Recipe
- Recipe Item
- Stock Movement
- Discount
- Audit Log

Setiap data operasional wajib memiliki outlet scope jika relevan.

---

## 16. Reporting Requirements

Filter laporan:

- Date range.
- Outlet.
- Cashier.
- Product.
- Category.
- Payment method.
- Order type.

Laporan minimum:

- Sales summary.
- Transaction count.
- Average order value.
- Sales by product.
- Sales by category.
- Sales by cashier.
- Sales by payment method.
- Shift reconciliation.
- Refund dan void.
- Expense.
- Current stock.
- Low stock.
- Stock movement.

---

## 17. UI/UX Requirements

### 17.1 Visual Direction

- Modern.
- Hangat.
- Sederhana.
- Cepat.
- Ramah.
- Menggugah selera.

### 17.2 Design Tokens

- Primary Red: `#A91F34`
- Dark Red: `#7F1628`
- Accent Yellow: `#FFD84D`
- Warm Cream: `#FFF4D6`
- Background: `#FFF9F2`
- Text Dark: `#2D2022`
- Success: `#2E9D64`
- Warning: `#E99A22`
- Danger: `#D64545`

### 17.3 POS Layout

- Category navigation.
- Product grid.
- Persistent cart pada desktop.
- Cart drawer pada mobile.
- Outlet, cashier, shift, dan connection indicator.
- Hold, clear, discount, dan pay action.

> Implementasi konkret layout ini terdapat pada mockup Kasir. Lihat Lampiran A.2.

### 17.5 Tipografi

- Font antarmuka: Plus Jakarta Sans.
- Nilai rupiah dan angka: JetBrains Mono (monospace) agar mudah dibaca kasir.

### 17.6 Referensi Layar

Empat layar utama per role telah diprototipekan dan menjadi acuan visual serta interaksi. Detail lengkap ada pada Lampiran A:

- Owner Dashboard — `Wanna Dimsum POS Mockup.dc.html`
- Kasir (POS) — `Wanna Dimsum Kasir.dc.html`
- Kitchen Display — `Wanna Dimsum Kitchen Display.dc.html`
- Inventori — `Wanna Dimsum Inventory.dc.html`

### 17.4 Required UI States

- Loading.
- Empty.
- Error.
- Success.
- Unauthorized.
- Confirmation.
- Disabled.
- Connection issue.

---

## 18. Success Metrics

### 18.1 Operational Metrics

- Average order input time.
- Average payment completion time.
- Average kitchen preparation time.
- Transaction failure rate.
- Duplicate payment attempts prevented.
- Stock adjustment incidents.
- Cash difference per shift.

### 18.2 Business Metrics

- Daily revenue.
- Transaction count.
- Average order value.
- Best-selling products.
- Sales by hour.
- Refund rate.
- Void rate.
- Inventory variance.

### 18.3 Adoption Metrics

- Persentase transaksi yang masuk melalui POS.
- Persentase shift yang ditutup dengan benar.
- Persentase produk yang memiliki recipe.
- Persentase tindakan sensitif yang tercatat pada audit log.

---

## 19. MVP Acceptance Criteria

MVP dinyatakan siap apabila:

1. User dapat login sesuai role.
2. User hanya dapat mengakses outlet yang diizinkan.
3. Admin dapat mengelola product catalog.
4. Kasir dapat membuka shift.
5. Kasir dapat membuat order.
6. Kasir dapat menerima cash dan non-cash payment.
7. Duplicate payment dapat dicegah.
8. Paid order masuk ke kitchen display.
9. Stock berkurang berdasarkan recipe.
10. Receipt dapat dibuat dan dicetak ulang.
11. Kasir dapat menutup shift.
12. Expected dan actual cash dapat dibandingkan.
13. Owner dapat melihat daily sales.
14. Refund dan void memiliki approval dan audit.
15. Critical flow memiliki automated test.
16. Backup database berhasil diuji.
17. Tidak terdapat critical security issue.
18. Lint, typecheck, test, dan build berhasil.

---

## 20. Risks and Mitigation

### 20.1 SQLite Concurrency

**Risiko:** concurrent write dapat menyebabkan database lock.

**Mitigasi:**

- Aktifkan WAL.
- Gunakan transaction singkat.
- Hindari long-running write.
- Monitor lock dan slow query.
- Siapkan migration path ke PostgreSQL.

### 20.2 Duplicate Payment

**Risiko:** double-click atau network retry menghasilkan payment ganda.

**Mitigasi:**

- Idempotency key.
- Unique constraint.
- Disable payment button saat processing.
- Database transaction.

### 20.3 Stock Inaccuracy

**Risiko:** recipe salah atau movement terposting ganda.

**Mitigasi:**

- Versioned recipe.
- Idempotent stock posting.
- Stock movement ledger.
- Audited adjustment.
- Stock opname.

### 20.4 Unauthorized Access

**Risiko:** user mengakses data outlet lain.

**Mitigasi:**

- Server-side outlet authorization.
- Scoped query.
- Cross-outlet integration test.
- IDOR test.

### 20.5 Data Loss

**Risiko:** file SQLite rusak atau storage hilang.

**Mitigasi:**

- Persistent disk.
- Automated backup.
- Restore testing.
- Monitoring.

---

## 21. Dependencies

- VPS atau server Node.js.
- Persistent storage.
- Perangkat kasir.
- Thermal printer.
- Jaringan lokal atau internet.
- Product catalog.
- Recipe data.
- Opening stock.
- User dan role data.
- Outlet settings.
- SOP kasir, dapur, manager, dan inventory.

---

## 22. Open Questions

1. Apakah pajak aktif pada MVP?
2. Apakah service charge aktif?
3. Apakah dine-in membutuhkan nomor meja?
4. Apakah split payment diperlukan pada MVP?
5. Berapa batas selisih kas yang membutuhkan approval owner?
6. Apakah kasir dapat memberikan diskon manual?
7. Apakah partial refund per item diperlukan?
8. Apakah stok kemasan berkurang otomatis?
9. Apakah frozen dan matang menggunakan recipe berbeda?
10. Apakah dapur memiliki lebih dari satu station?
11. Apakah printer dapur digunakan pada MVP?
12. Apakah order marketplace dicatat manual?
13. Apakah customer database diperlukan pada MVP?
14. Berapa lama data transaksi disimpan?
15. Berapa jumlah kasir aktif secara bersamaan?

---

## 23. Implementation Phases

### Phase 0 — Decisions and Documentation

- Finalisasi open questions.
- Finalisasi architecture decisions.
- Finalisasi role matrix.
- Finalisasi catalog dan recipe.

### Phase 1 — Foundation

- Project setup.
- Database connection.
- Design system.
- Environment validation.
- CI dan test foundation.

### Phase 2 — Authentication and Outlet

- Login.
- Role dan permission.
- Outlet isolation.

### Phase 3 — Catalog

- Category.
- Product.
- Variant.
- Add-on.
- Availability.

### Phase 4 — Shift Foundation

- Open shift.
- Active shift.
- Opening cash.

### Phase 5 — POS and Payment

- Cart.
- Order.
- Checkout.
- Receipt.
- Payment idempotency.

### Phase 6 — Kitchen

- Kitchen ticket.
- Queue.
- Status.
- Timer.

### Phase 7 — Inventory

- Inventory item.
- Recipe.
- Stock movement.
- Automatic stock deduction.

### Phase 8 — Cash and Close Shift

- Cash movement.
- Expense.
- Close shift.
- Reconciliation.

### Phase 9 — Refund, Void, and Discount

- Permission.
- Approval.
- Reversal.
- Audit.

### Phase 10 — Reports

- Sales.
- Product.
- Payment.
- Shift.
- Inventory.

### Phase 11 — Hardening and UAT

- Security review.
- Performance review.
- E2E testing.
- Backup and restore test.
- UAT.

### Phase 12 — Production Launch

- Deployment.
- Training.
- SOP.
- Go-live.

---

## 24. Definition of Done

Sebuah fitur dianggap selesai apabila:

- Requirement terpenuhi.
- Business rule diterapkan.
- Authorization dilakukan di server.
- Input validation tersedia.
- Error handling tersedia.
- UI state lengkap.
- Migration tersedia bila diperlukan.
- Unit test tersedia.
- Integration test tersedia bila relevan.
- E2E tersedia untuk critical flow.
- Lint berhasil.
- Typecheck berhasil.
- Build berhasil.
- Dokumentasi diperbarui.
- Manual verification dilakukan.
- Tidak memiliki critical bug.

---

## 25. Final Product Statement

Wanna Dimsum POS harus menjadi sistem operasional yang mudah digunakan oleh kasir, tetapi tetap kuat dalam menjaga konsistensi data transaksi, pembayaran, stok, dan laporan.

Prioritas utama produk adalah:

1. Kecepatan transaksi.
2. Keakuratan data.
3. Kemudahan penggunaan.
4. Keamanan operasional.
5. Keterlacakan aktivitas.
6. Kesiapan untuk berkembang menjadi multi-outlet.

---

## Lampiran A — Referensi Mockup

Lampiran ini mendokumentasikan empat layar prototipe (high-fidelity) yang telah dibuat sebagai acuan visual dan interaksi. Seluruh layar menggunakan design token pada bagian 17.2, tipografi Plus Jakarta Sans + JetBrains Mono, dan pola UI yang konsisten (header outlet, indikator koneksi, identitas pengguna & role).

Status prototipe: **UI/UX interaktif (front-end only)**. Belum terhubung ke backend, autentikasi, atau database. Prototipe menggunakan data contoh dan menjadi rujukan untuk implementasi sesungguhnya.

### A.1 Owner Dashboard — `Wanna Dimsum POS Mockup.dc.html`

**Role:** Owner (lihat 6.1). **Tujuan:** visibilitas bisnis tanpa rekap manual (JTBD Owner, 7).

**Elemen yang ada:**

- Sidebar navigasi lengkap seluruh modul (Dashboard, Kasir, Daftar Pesanan, Kitchen Display, Laporan, Inventori, Produk, Promosi, Pelanggan, Keuangan, Pengeluaran, Buku Kas, Gaji, Invoice, Akses Karyawan, Jadwal Kerja, Kasbon, Pengaturan Bisnis, Terminal, Order Online, Pengaturan, Akun Profil) dengan sub-menu bertingkat.
- Top bar: judul modul aktif, indikator koneksi (Online), notifikasi, profil pengguna (Owner).
- Sapaan + pemilih periode (Hari ini / Minggu ini / Bulan ini).
- 4 kartu statistik: Omzet Hari Ini, Transaksi, Produk Terjual, Pelanggan Baru (dengan tren vs kemarin).
- Grafik penjualan 7 hari terakhir (bar chart).
- Rincian metode pembayaran (Tunai, QRIS, Kartu Debit, GoFood/Grab).
- Tabel Produk Terlaris (terjual, omzet, badge stok).
- Daftar Transaksi Terakhir.

**Navigasi & cakupan halaman:**

Owner Dashboard kini berupa **satu file dengan routing internal**: mengklik menu atau sub-menu mana pun pada sidebar langsung menampilkan halaman terkait di area utama (tanpa berpindah file). Seluruh item menu — hingga leaf terdalam — memiliki halaman. Halaman dihasilkan melalui **mesin halaman berbasis arketipe** yang menyesuaikan konten dengan domain menu:

- **Halaman Daftar (tabel):** breadcrumb, kartu KPI, toolbar (pencarian + filter + export), tabel data dengan badge status dan paginasi. Contoh: Daftar Pelanggan, Produk/Buku Menu, Daftar Stok, Invoice, Pemasok, Karyawan, Terminal, Outlet, Buku Kas, Pengeluaran.
- **Halaman Laporan:** filter periode + outlet, kartu KPI, grafik tren (hanya untuk laporan berbasis tren seperti Penjualan/Analisa/Arus Kas), dan tabel. Contoh: Laba Rugi, Neraca, Ringkasan Penjualan, Analisa Laporan.
- **Halaman Pengaturan (form):** kartu bersection dengan field (teks, select, toggle) dan aksi Simpan/Batal. Contoh: Pengaturan Pembayaran, Notifikasi, Informasi Bisnis.
- **Kitchen Display:** papan tiga kolom status; **Kasir:** kartu tautan ke mockup layar kasir.

Catatan status: data tiap halaman bersifat kontekstual per-domain namun masih menggunakan **data contoh dari template arketipe** — halaman sejenis memakai layout domain yang sama dan belum dikustomisasi satu per satu. Halaman spesifik dapat diperdalam menjadi desain bespoke sesuai kebutuhan.

**Pemetaan requirement:** 4.1(6), 6.1, 16 (Reporting), 18.2 (Business Metrics), 8.9 (Reporting). Struktur sidebar mencakup seluruh modul pada Bagian 8, 9, dan 16.

### A.2 Kasir (POS) — `Wanna Dimsum Kasir.dc.html`

**Role:** Kasir (lihat 6.3). **Tujuan:** input pesanan cepat & pembayaran akurat (JTBD Kasir, 7; Flow 10.2).

**Elemen yang ada:**

- Header: outlet, pencarian produk + scan barcode, timer shift, indikator Online, identitas kasir & terminal.
- Rail kategori kiri dengan jumlah item per kategori (Semua, Dimsum, Kukus, Goreng, Paket, Minuman, Add-on).
- Grid produk: badge status stok (Tersedia/Menipis/Habis), harga, tombol tambah, dan badge jumlah item yang sudah masuk keranjang; produk habis dinonaktifkan.
- Panel pesanan kanan: tipe pesanan (Dine-in / Takeaway / Delivery), nomor meja/antrean/order, jumlah tamu, nomor transaksi.
- Keranjang: stepper jumlah, hapus item, harga per baris.
- Ringkasan: subtotal, PPN, total; tombol Tahan (hold) & Bayar.
- Modal pembayaran: metode Tunai / QRIS / Kartu / E-Wallet, keypad nominal + nominal cepat (Uang Pas/50rb/100rb/150rb), perhitungan kembalian; layar sukses dengan kembalian + Cetak Struk / Transaksi Baru.

**Pemetaan requirement:** 8.4 (POS), 8.5 (Payment), FR-004, FR-006, FR-007, 13.5 (Usability, pembayaran ≤ 3 langkah), 17.3, 17.4 (UI states: empty, success, disabled). Catatan: proteksi duplicate payment (FR-006/BR-003) bersifat back-end dan belum tercakup di prototipe.

### A.3 Kitchen Display — `Wanna Dimsum Kitchen Display.dc.html`

**Role:** Tim Dapur (lihat 6.4). **Tujuan:** memproses antrean pesanan sesuai alur (JTBD Dapur, 7; Flow 10.3).

**Elemen yang ada:**

- Header: filter stasiun (Semua / Kukus / Goreng / Minuman), jam live, indikator Online, identitas staf dapur & shift.
- Papan tiga kolom sesuai status: Baru → Sedang Dimasak → Siap Antar (dengan hitungan per kolom).
- Kartu tiket: nomor pesanan, badge tipe (Dine-in/Takeaway/GoFood/GrabFood), timer aging live yang berubah warna (hijau → kuning → merah berkedip saat melewati ambang).
- Daftar item dengan qty, catatan item, checklist per item (coret bila selesai), indikator progres x/y siap.
- Tombol aksi maju status (Mulai Masak / Tandai Siap / Sudah Diantar) dan tombol kembalikan status.
- Scroll per kolom dan per daftar item agar tiket tidak terpotong saat pesanan menumpuk.

**Pemetaan requirement:** 8.6 (KDS: New/Accepted/Preparing/Ready/Completed/Cancelled + timer + catatan item), FR-008, Flow 10.3. Ambang timer dapat dikonfigurasi (warn/alert). Catatan: badge GoFood/GrabFood hanya penanda tipe order manual (integrasi marketplace tetap Non-Goal, lihat 5).

### A.4 Inventori — `Wanna Dimsum Inventory.dc.html`

**Role:** Staf Inventory (lihat 6.5). **Tujuan:** memantau & mencatat pergerakan stok (JTBD Inventory, 7).

**Elemen yang ada:**

- Header: pencarian (nama/SKU/kategori), status Tersinkron, identitas staf.
- 4 kartu ringkasan: Total SKU, Nilai Persediaan, Perlu Restock (menipis + habis), Hampir Kedaluwarsa (≤ 3 hari).
- Toolbar: filter kategori (Bahan Baku/Kemasan/Minuman/Operasional) + filter status (Tersedia/Menipis/Habis) + tombol Stok Opname & Tambah Stok.
- Tabel stok: nama + SKU + tag kedaluwarsa, kategori, jumlah + satuan, stok minimum, status, nilai stok, aksi cepat (stok masuk ↑ / stok keluar ↓). Baris habis disorot.
- Modal penyesuaian stok: tab Stok Masuk / Stok Keluar / Opname, stepper jumlah + nominal cepat, dan pratinjau "stok sekarang → hasil".

**Pemetaan requirement:** 8.8 (Inventory: stock movement, minimum stock, manual adjustment), FR-011, BR-006 (setiap perubahan via stock movement ledger), 16 (Current/Low stock). Catatan: Stok Opname secara resmi Post-MVP (lihat 9); di prototipe ditampilkan sebagai UI untuk validasi alur. Pengurangan stok otomatis berbasis resep (FR-013/BR-013) bersifat back-end dan tidak divisualisasikan di layar ini.

### A.5 Cakupan yang Belum Diprototipekan

Layar/alur berikut disebut dalam PRD namun belum dibuat mockup-nya dan menjadi kandidat berikutnya:

- Autentikasi: login & PIN kasir (8.1).
- Open/Close Shift & rekonsiliasi kas (8.7, Flow 10.1 & 10.4).
- Refund & Void dengan approval (8.10, Flow 10.5).
- Manajemen katalog produk & resep (8.3, 8.8 Recipe).
- Audit Log (8.10).

Catatan: Manajemen katalog produk, laporan per filter (Bagian 16), dan pengaturan outlet kini sudah memiliki **halaman representatif** melalui routing Owner (Lampiran A.1), namun belum berupa desain bespoke dan belum mencakup alur interaksi penuh (mis. form tambah/edit produk, generator laporan). Autentikasi, shift, dan refund/void tetap belum diprototipekan.
