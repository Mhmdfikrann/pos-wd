# Rencana Implementasi Revisi 03 — Wanna Dimsum POS

> **Sumber Permintaan**: [`docs/update/revisi-03.md`](file:///home/mhmdfikran/Documents/Fx-Project/pos-wd/docs/update/revisi-03.md)  
> **Tujuan**: Mengimplementasikan 8 poin revisi dari klien terkait peningkatan fitur Katalog Owner, Produk Ekstra (Add-on), Resep Inventory, Produk Paket (Combo Menu), dan Halaman Pengaturan Harga Ojek Online.

---

## 📅 Urutan Phase Implementasi

| Phase | Nama Phase | Dokumen Phase | Fokus & Scope |
|---|---|---|---|
| **U03-00** | Data Schema & Migrations | [`phase-u03-00-schema-migrations.md`](file:///home/mhmdfikran/Documents/Fx-Project/pos-wd/docs/update/implementation/revisi-03/phase-u03-00-schema-migrations.md) | Penambahan kolom `isMandatory`, `selectMode` pada `addons`, `minOrder`, `isFavorite`, `showInBar`, `onlinePrices` pada `products`, tabel pivot `product_addons`, dan membuat SQL migration. |
| **U03-01** | Produk Ekstra (Wajib/Opsional, Pilih 1/Beberapa & Link Produk) | [`phase-u03-01-addon-enhancements.md`](file:///home/mhmdfikran/Documents/Fx-Project/pos-wd/docs/update/implementation/revisi-03/phase-u03-01-addon-enhancements.md) | Form Add-on dengan jenis & cara pilih, serta sub-tab keterikatan Produk Ekstra pada form tambah/edit produk. |
| **U03-02** | Rincian Resep Inventory (Harga Modal, Takaran, Satuan) | [`phase-u03-02-recipe-inventory-details.md`](file:///home/mhmdfikran/Documents/Fx-Project/pos-wd/docs/update/implementation/revisi-03/phase-u03-02-recipe-inventory-details.md) | Memperjelas tampilan Harga Modal, Takaran, dan Satuan pada sub-tab Resep Inventory di modal produk. |
| **U03-03** | Form, Status, Detail & Ekspor Produk Paket (Combo Menu) | [`phase-u03-03-package-menu-complete.md`](file:///home/mhmdfikran/Documents/Fx-Project/pos-wd/docs/update/implementation/revisi-03/phase-u03-03-package-menu-complete.md) | Pembaruan form produk paket (auto/manual SKU, min order, opsi favorit/bar, tabel komponen dengan icon hapus), ekspor CSV paket, status aktif/available. |
| **U03-04** | Halaman Pengaturan "Harga Ojek Online" | [`phase-u03-04-online-delivery-pricing.md`](file:///home/mhmdfikran/Documents/Fx-Project/pos-wd/docs/update/implementation/revisi-03/phase-u03-04-online-delivery-pricing.md) | Menu baru di Sidebar Owner > Produk > Harga Ojek Online & UI pengaturan harga khusus GoFood, GrabFood, ShopeeFood. |
| **U03-05** | Polishing UI, Integration Testing & UAT Verification | [`phase-u03-05-polishing-test-uat.md`](file:///home/mhmdfikran/Documents/Fx-Project/pos-wd/docs/update/implementation/revisi-03/phase-u03-05-polishing-test-uat.md) | Polishing antarmuka visual, pembuatan unit/integration tests (`revisi-03-uat.test.ts`), dan eksekusi UAT-03-01 s/d UAT-03-08. |

---

## 🎯 Panduan Pengerjaan untuk Agent
- Selalu baca [`AGENTS.md`](file:///home/mhmdfikran/Documents/Fx-Project/pos-wd/AGENTS.md) dan berkas phase sebelum menulis kode.
- Jalankan `npm run typecheck` dan `npm test` di setiap akhir phase.
