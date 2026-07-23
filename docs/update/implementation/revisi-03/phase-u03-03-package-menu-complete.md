# Phase U03-03: Form, Status, Detail & Ekspor Produk Paket (Combo Menu)

> **Fokus**: Memperlengkap fitur **Produk Paket (Combo Menu)** mencakup pengisian Kode Paket (auto/manual), minimal pembelian, opsi lanjutan (favorit & tampil di bar), UI tabel komponen dengan icon hapus, serta memastikan ekspor CSV dan status aktif/available berfungsi 100%.

---

## 1. Persyaratan & Ruang Lingkup

1. **Pembaruan Form Produk Paket**:
   - **Kode Paket (SKU)**: Input text dengan tombol "Generate Otomatis" (format `PKT-XXXX`).
   - **Minimal Pembelian**: Input numeric (default `1`).
   - **Opsi Lanjutan**: Checklist **Tampil di Bar / Station** & Checklist **Produk Favorit**.
   - **Tabel Komponen Paket**: Menampilkan kolom Nama Produk, Jumlah, Satuan, dan Tombol Icon Hapus (logo tempat sampah).

2. **Perbaikan Fitur Ekspor CSV (`src/lib/csv.ts` & `CatalogManager.tsx`)**:
   - Ekspor CSV menyertakan kolom `Tipe Menu` (`single` vs `package`), `Minimal Pembelian`, `Favorit`, dan `Tampil di Bar`.

3. **Status & Detail Produk Paket**:
   - Memastikan toggle status ketersediaan (*Tersedia / Habis*) dan soft-delete pada Produk Paket berfungsi penuh.
   - Memastikan saat mengklik edit pada Produk Paket, seluruh data rincian komponen paket dan opsi lanjutan termuat dengan benar.

---

## 2. Rencana Perubahan Komponen & Berkas

1. **`src/lib/catalog-actions.ts`**:
   - Perbarui `actionCreateProduct`, `actionUpdateProduct`, `actionGetProductDetails`, dan `actionImportProducts` untuk menangani `minOrder`, `isFavorite`, `showInBar`.
2. **`src/components/owner/CatalogManager.tsx`**:
   - Update form `EditModal` (tipe Paket) dengan Kode Paket auto/manual, Min Order, Favorit, Bar, dan Trash icon pada tabel komponen.
   - Update fungsi ekspor CSV.

---

## 3. Kriteria Selesai (Definition of Done)

- [ ] Kode Paket dapat diisi manual atau di-generate otomatis.
- [ ] Opsi Minimal Pembelian, Produk Favorit, dan Tampil di Bar tersimpan ke DB.
- [ ] Tabel komponen paket memiliki logo/icon button hapus produk.
- [ ] Fitur Ekspor CSV paket & pengubahan status ketersediaan paket berfungsi 100%.
- [ ] Typecheck (`npm run typecheck`) & Vitest (`npm test`) lulus tanpa error.
