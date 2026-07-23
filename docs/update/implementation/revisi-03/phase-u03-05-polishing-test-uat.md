# Phase U03-05: Polishing UI, Integration Testing & UAT Verification

> **Fokus**: Polishing tampilan visual UI, pembuatan berkas pengujian integrasi (`revisi-03-uat.test.ts`), dan verifikasi UAT lengkap untuk seluruh 8 poin Revisi 03.

---

## 1. Persyaratan & Ruang Lingkup

1. **Polishing UI & Visual Consistency**:
   - Memastikan seluruh form, tabel, badge, icon, dan modal mengikuti *Design Tokens* Wanna Dimsum POS (`#A91F34`, Plus Jakarta Sans, JetBrains Mono, micro-interactions).

2. **Pengujian Integrasi (`src/lib/revisi-03-uat.test.ts`)**:
   - Membuat pengujian Vitest untuk memverifikasi secara otomatis seluruh 8 poin revisi:
     - UAT-03-01: Penautan Add-on (Wajib/Opsional, 1/Beberapa) pada Produk.
     - UAT-03-02: Rincian Resep Inventory (Harga Modal, Takaran, Satuan).
     - UAT-03-03: Ekspor CSV Produk Paket & Single.
     - UAT-03-04: Pengelolaan status ketersediaan & aktif Produk Paket.
     - UAT-03-05: Form Produk Paket (Kode manual/auto, Min Order, Favorit, Bar, Trash icon).
     - UAT-03-06: Detail & Edit Produk Paket.
     - UAT-03-07: Pengaturan Harga Ojek Online (GoFood, GrabFood, ShopeeFood).
     - UAT-03-08: Navigasi Sidebar "Harga Ojek Online".

---

## 2. Matriks Skenario UAT Revisi 03

| ID Test | Deskripsi Skenario | Hasil yang Diharapkan |
|---|---|---|
| **UAT-03-01** | Owner mengatur Add-on Wajib/Opsional & Pilih 1/Beberapa | Atribut jenis & cara pilih add-on tersimpan dan dapat dikaitkan ke produk. |
| **UAT-03-02** | Owner melihat sub-tab Resep Inventory pada produk | Tampil kolom Harga Modal, Takaran, Satuan, dan kalkulasi otomatis HPP. |
| **UAT-03-03** | Owner menekan "Export CSV" | File CSV mengekspor produk single dan paket lengkap dengan atributnya. |
| **UAT-03-04** | Owner mengubah status ketersediaan/aktif Paket | Status ketersediaan paket ter-update dan tersinkronisasi di Kasir. |
| **UAT-03-05** | Owner membuat Produk Paket dengan Kode Auto/Manual | Kode SKU paket ter-generate/terisi, min order & favorit/bar tersimpan. |
| **UAT-03-06** | Owner menghapus item komponen paket pada modal edit | Klik icon trash menghapus baris komponen dari paket. |
| **UAT-03-07** | Owner membuka sidebar "Harga Ojek Online" | Halaman pengelolaan harga GoFood, GrabFood, ShopeeFood terbuka presisi. |
| **UAT-03-08** | Owner menyimpan perubahan harga Ojol per produk | Harga GoFood/GrabFood/ShopeeFood tersimpan di DB. |

---

## 3. Kriteria Selesai (Definition of Done)

- [ ] Seluruh test Vitest (`npm test`) lulus 100%.
- [ ] Typecheck (`npm run typecheck`) & Linter (`npm run lint`) lulus 0 error & 0 warning.
- [ ] Seluruh skenario UAT-03-01 s/d UAT-03-08 terverifikasi sempurna.
