# Phase U02-03: Form Varian, Produk Ekstra, dan Resep (Link ke Inventory)

> **Fokus**: Memperluas modal Tambah/Edit Menu pada Halaman Produk Owner dengan penambahan pengisian Varian, Add-on Ekstra, serta komposisi Resep yang terhubung ke data *Inventory*.

---

## 1. Persyaratan & Ruang Lingkup

- **Struktur Modal Produk Ber-tab / Multi-section**:
  Modal Tambah/Edit Menu diperluas dengan tab navigasi internal:
  1. **Informasi Umum**: Nama, SKU, Kategori, Harga Jual, Harga Modal (HPP), Satuan, Station Dapur.
  2. **Varian Produk**: Daftar varian (misal: "Level 1 (+Rp 0)", "Level 2 (+Rp 2.000)", "Jumbo (+Rp 5.000)").
  3. **Produk Ekstra (Add-on)**: Checkbox/selector untuk memilih add-on ekstra mana saja yang berlaku untuk menu ini.
  4. **Resep (Bahan Baku Inventory)**: Form dinamis untuk memilih bahan baku dari `inventory_items`, memasukkan jumlah pemakaian per porsi, dan menampilkan satuan otomatis dari item inventory.

- **Integrasi Inventory**:
  - Pilihan bahan baku pada tab **Resep** mengambil daftar bahan baku aktif dari DB `inventory_items`.
  - Mengkalkulasi estimasi total HPP secara otomatis berdasarkan (jumlah pemakaian × unit cost bahan baku).

---

## 2. Rencana Perubahan Komponen & Berkas

1. **`src/lib/catalog-actions.ts`**:
   - Tambahkan Server Action `actionGetInventoryItems()` untuk mengambil daftar bahan baku untuk opsi resep.
   - Update `actionCreateProduct` dan `actionUpdateProduct` untuk menyimpan data varian (`product_variants`), add-on terikat, dan resep (`recipes` + `recipe_items`).

2. **`src/components/owner/CatalogManager.tsx`**:
   - Perbarui `EditModal` untuk tipe `produk` dengan sub-tab: `[ Umum | Varian | Add-on | Resep Inventory ]`.
   - Implementasikan form penambahan/penghapusan baris varian dan baris resep bahan baku secara fleksibel.

---

## 3. Kriteria Selesai (Definition of Done)

- [ ] Modal Tambah/Edit Produk memiliki sub-tab untuk Varian, Add-on, dan Resep.
- [ ] Varian dapat ditambah/dihapus dengan input nama varian dan penambahan harga (delta price).
- [ ] Opsi bahan baku pada tab Resep dapat dipilih dari daftar item Inventory yang ada di database.
- [ ] Penyimpanan menu berhasil menyimpan varian dan relasi resep ke database Drizzle ORM.
