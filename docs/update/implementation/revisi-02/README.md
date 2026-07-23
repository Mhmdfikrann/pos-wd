# Implementasi Update Revisi 02 — Owner Halaman Produk

> Sumber update owner: [`docs/update/revisi-02.md`](../../revisi-02.md).  
> Folder ini memecah revisi tersebut menjadi fase implementasi yang bisa dikerjakan bertahap tanpa mencampur scope.

## Ringkasan Analisis

Revisi 02 berfokus pada **Halaman Produk (Owner Suite)** untuk menyempurnakan manajemen produk, kategori, varian, resep inventory, HPP, serta penanganan menu paket dan impor-ekspor massal.

Update ini mencakup 6 poin revisi utama:

| # | Permintaan Owner | Area | Dampak Utama |
|---|---|---|---|
| 1 | Import dan Export menu secara massal | Owner Catalog | Fitur unduh CSV/Excel produk & unggah/impor massal produk baru/update dengan validasi schema. |
| 2 | Nonaktifkan menu diganti Hapus Menu | Owner Catalog / Product | Ubah tombol "Nonaktifkan" menjadi "Hapus Menu", saring (*filter out*) menu terhapus dari UI list produk agar tampilan bersih. |
| 3 | Pop-up Tambah Menu: Tambahkan Varian, Ekstra, dan Resep (link ke Inventory) | Owner Modal / Form | Tambah tab/section interaktif untuk Varian (delta harga), Add-on ekstra, dan Resep (koneksi ke `inventory_items`). |
| 4 | Halaman Tambah Menu: Masukkan Jenis Satuan & Harga Modal (HPP) | Owner Product Form | Tambah field `unit` (Satuan) dan `costPrice` (Harga Modal HPP Rp) pada modal tambah/edit produk & DB schema `products`. |
| 5 | Kategori nonaktif diganti Hapus Kategori & dihilangkan | Owner Category | Ubah tombol "Nonaktifkan Kategori" menjadi "Hapus Kategori", saring (*filter out*) kategori terhapus dari list UI & dropdown kasir. |
| 6 | Menu Paket tidak bisa ditambahkan (Dukungan Menu Paket) | Owner Catalog / Package | Tambah opsi Tipe Menu (`single` vs `package`), serta komponen pemilih item-item komponen paket. |

---

## Keputusan Arsitektur & Data (U02-00)

1. **Import & Export Massal**: Menggunakan format `.csv` standar dengan UTF-8 encoding. Export menyusun data `name`, `sku`, `category`, `price`, `costPrice`, `unit`, `kitchenStation`. Import memvalidasi SKU unik & ketersediaan kategori sebelum *batch insert/update*.
2. **Penghapusan Menu & Kategori**: Mengubah aksi soft-deactivate UI menjadi "Hapus". Data di database dapat menggunakan `active = false` / `deleted_at`, tetapi **disaring (*filtered out*)** penuh dari query tampilan UI sehingga item yang dihapus tidak lagi menumpuk atau terlihat di antarmuka pengguna.
3. **Resep & Inventory Linkage**: Mengaitkan produk dengan bahan baku `inventory_items` melalui tabel relational `recipes` & `recipe_items`. Modal produk dapat menambahkan/mengedit komposisi resep per produk/varian.
4. **HPP & Satuan**: Tambah kolom `unit` pada tabel `products` (opsi: Porsi, Pcs, Piring, Mangkuk, Paket, dll). `costPrice` (HPP) disimpan dalam integer Rupiah.
5. **Menu Paket**: Menyediakan flag / tipe produk `isPackage` atau `packageItems`. Produk paket dapat terdiri dari kumpulan produk-produk biasa.

---

## Peta Fase Implementasi

| Fase | Berkas | Fokus Utama | Bergantung Pada |
|------|------|-------------|-----------------|
| **U02-00** | [`phase-u02-00-analysis-decisions.md`](phase-u02-00-analysis-decisions.md) | **Dokumen Keputusan**: Keputusan data, UI modal, schema migration, dan kriteria penerimaan UAT Revisi 02. | — |
| **U02-01** | [`phase-u02-01-bulk-import-export.md`](phase-u02-01-bulk-import-export.md) | Fitur Import & Export CSV menu secara massal pada Halaman Produk. | U02-00 |
| **U02-02** | [`phase-u02-02-menu-category-deletion.md`](phase-u02-02-menu-category-deletion.md) | Mengganti "Nonaktifkan" menjadi "Hapus" pada Menu & Kategori, serta memfilter UI dari item terhapus. | U02-00 |
| **U02-03** | [`phase-u02-03-variants-addons-recipe-inventory.md`](phase-u02-03-variants-addons-recipe-inventory.md) | Perluasan Pop-up Tambah/Edit Menu: Form Varian, Add-on Ekstra, dan Resep terhubung ke Inventory. | U02-00 |
| **U02-04** | [`phase-u02-04-unit-hpp-package-menu.md`](phase-u02-04-unit-hpp-package-menu.md) | Input Jenis Satuan, Harga Modal (HPP), dan penanganan Menu Paket. | U02-03 |
| **U02-05** | [`phase-u02-05-owner-catalog-uat.md`](phase-u02-05-owner-catalog-uat.md) | Polishing UI Owner Catalog, pengujian server actions, regression tests & UAT. | U02-01, U02-02, U02-04 |

---

## Dependency Graph

```text
U02-00 (Analisis & Keputusan)
  ├─▶ U02-01 (Bulk Import/Export) ──────────────┐
  ├─▶ U02-02 (Penghapusan Menu & Kategori) ─────┤
  └─▶ U02-03 (Varian, Ekstra, Resep Inventory)  │
        └─▶ U02-04 (Satuan, HPP, Menu Paket) ───┴─▶ U02-05 (Polishing & UAT)
```

---

## Catatan untuk Agent Pemrogram

- Selalu merujuk pada [`AGENTS.md`](../../../../AGENTS.md) dan petunjuk arsitektur Next.js 16 / Turbopack / Drizzle ORM.
- Semua nilai mata uang wajib memakai integer Rupiah dan diformat dengan helper `formatRupiah`.
- Pastikan perubahan UI pada `CatalogManager.tsx` tetap mempertahankan estetika design tokens (`tokens`, `tones`, `#A91F34`, `#FFF9F2`).
