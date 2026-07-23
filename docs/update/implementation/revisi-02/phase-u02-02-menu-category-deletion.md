# Phase U02-02: Penghapusan Menu & Kategori ("Hapus Menu" & "Hapus Kategori")

> **Fokus**: Mengubah aksi "Nonaktifkan" menjadi **"Hapus Menu"** dan **"Hapus Kategori"**, serta menyaring (*filter out*) seluruh item terhapus agar tidak memenuhi antarmuka pengguna.

---

## 1. Persyaratan & Ruang Lingkup

- **Perubahan UI Produk**:
  - Ganti tombol "Nonaktifkan" pada tabel produk (`ProductTable`) menjadi tombol berlabel **"Hapus"** (dengan warna merah / warning tone).
  - Saat diklik, tampilkan modal konfirmasi: `"Apakah Anda yakin ingin menghapus menu [Nama Menu]? Menu yang dihapus tidak akan ditampilkan lagi."`
  - Setelah dikonfirmasi, panggil `actionDeleteProduct(id)`.

- **Perubahan UI Kategori**:
  - Ganti tombol "Nonaktifkan" pada tabel kategori (`CategoryTable`) menjadi tombol **"Hapus"**.
  - Tampilkan modal konfirmasi: `"Apakah Anda yakin ingin menghapus kategori [Nama Kategori]? Kategori yang dihapus tidak dapat dikembalikan."`
  - Panggil `actionDeleteCategory(id)`.

- **Penyaringan Tampilan (UI Clean Up)**:
  - Pembacaan catalog di `actionLoadCatalog()` atau pemrosesan client-side di `CatalogManager.tsx` dan `KasirClient.tsx` **wajib menyaring** item dengan status nonaktif/terhapus.
  - Produk & kategori terhapus **tidak akan pernah muncul** lagi di tabel Owner maupun pilihan menu Kasir.

---

## 2. Rencana Perubahan Komponen & Berkas

1. **`src/lib/catalog-actions.ts`**:
   - Update `actionLoadCatalog()` agar menyertakan kriteria filter `where(eq(products.active, true))` dan `where(eq(categories.active, true))`.
   - Update `actionDeactivateProduct` / buat `actionDeleteProduct` untuk memastikan audit log mencatat aksi hapus produk.
   - Update `actionDeactivateCategory` / buat `actionDeleteCategory`.

2. **`src/components/owner/CatalogManager.tsx`**:
   - Ubah `ProductTable`: Hapus kolom/badge status nonaktif, ganti tombol `Nonaktifkan` menjadi `Hapus`.
   - Ubah `CategoryTable`: Hapus badge status nonaktif, ganti tombol `Nonaktifkan` menjadi `Hapus`.
   - Sediakan dialog konfirmasi hapus sederhana sebelum mengeksekusi penghapusan.

---

## 3. Kriteria Selesai (Definition of Done)

- [ ] Label tombol pada tabel Produk & Kategori telah berubah menjadi "Hapus".
- [ ] Dialog konfirmasi muncul sebelum proses penghapusan dilakukan.
- [ ] Produk dan Kategori yang dihapus seketika menghilang dari antarmuka Owner & Kasir.
- [ ] Tampilan UI bersih dari badge "Nonaktif" yang menumpuk.
