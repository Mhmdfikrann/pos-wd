# Phase U02-01: Bulk Import & Export Menu Massal

> **Fokus**: Menambahkan fitur Ekspor dan Impor data produk secara massal via CSV/Excel pada Halaman Produk Owner (`CatalogManager`).

---

## 1. Persyaratan & Ruang Lingkup

- **Export CSV**:
  - Tombol "Export CSV" pada toolbar Halaman Buku Menu Owner.
  - Saat diklik, sistem mengunduh file `katalog-produk-[tanggal].csv` berisi seluruh produk aktif.
  - Kolom CSV: `SKU`, `Nama Produk`, `Kategori`, `Harga Jual`, `Harga Modal (HPP)`, `Satuan`, `Station Dapur`, `Status`.

- **Import CSV**:
  - Tombol "Import CSV" membuka modal pengunggah file CSV.
  - Fitur parsing & validasi awal client-side:
    - Memeriksa kelengkapan kolom wajib (`Nama Produk`, `Harga Jual`, `Kategori`).
    - Memeriksa keunikan SKU dalam file dan DB.
  - Menampilkan ringkasan preview (misal: "5 produk baru akan ditambahkan, 2 produk akan di-update").
  - Tombol konfirmasi "Proses Import" yang memanggil Server Action `actionImportProducts`.

---

## 2. Rencana Perubahan Komponen & Berkas

1. **`src/lib/catalog-actions.ts`**:
   - Tambahkan Server Action `actionExportProducts()` dan `actionImportProducts(rows: BulkProductInput[])`.
   - Validasi nama kategori (mencari atau membuat kategori baru secara otomatis jika belum ada).

2. **`src/components/owner/CatalogManager.tsx`**:
   - Tambahkan UI tombol **Export** dan **Import** pada Toolbar `tab === "produk"`.
   - Buat sub-komponen `ImportModal` untuk memproses unggahan file CSV, parse teks, dan menampilkan preview data sebelum di-submit.

3. **`src/lib/csv.ts` (Helper Baru)**:
   - Buat helper generator CSV (`arrayToCsv`) dan parser CSV (`csvToArray`) yang handal untuk menangani tanda kutip, koma, dan karakter khusus.

---

## 3. Langkah Pelaksanaan

1. Buat helper CSV di `src/lib/csv.ts`.
2. Tambahkan Server Action `actionImportProducts` di `src/lib/catalog-actions.ts`.
3. Buat UI modal `ImportModal` dan tombol trigger Export/Import di `CatalogManager.tsx`.
4. Uji alur Ekspor data produk, modifikasi file CSV, dan Impor kembali ke sistem.

---

## 4. Kriteria Selesai (Definition of Done)

- [ ] File CSV berhasil diunduh dengan format data dan header yang rapi.
- [ ] Pengunggah file CSV dapat membaca file dengan benar dan menampilkan preview data.
- [ ] Data produk baru/ter-update tersimpan ke database SQLite via Drizzle ORM tanpa merusak data yang sudah ada.
