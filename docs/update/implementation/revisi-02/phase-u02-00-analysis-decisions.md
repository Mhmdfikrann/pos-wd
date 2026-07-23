# Phase U02-00: Analisis & Keputusan Arsitektur Revisi 02

> **Tujuan**: Mengunci seluruh keputusan desain data, alur UI modal, dan kriteria penerimaan UAT untuk 6 poin revisi Halaman Produk Owner (`revisi-02.md`).

---

## 1. Latar Belakang & Ruang Lingkup

Klien memberikan 6 poin pembaruan khusus untuk **Role Owner — Halaman Produk**:
1. **Import & Export Massal**: Ekspor menu ke CSV/Excel dan Impor massal data menu baru/edit via file.
2. **Hapus Menu menggantikan Nonaktifkan Menu**: Mengubah konsep "Nonaktifkan" produk menjadi "Hapus Menu", serta menyaring produk yang sudah dihapus agar tidak memenuhi antarmuka list produk.
3. **Pop-up Tambah Menu Terintegrasi**: Menambahkan pengisian Varian, Produk Ekstra (Add-on), dan Resep bahan baku yang terhubung langsung dengan modul *Inventory*.
4. **Input Satuan & HPP (Harga Modal)**: Menambahkan bidang pengisian Jenis Satuan (Porsi, Pcs, Piring, dll) dan Harga Modal HPP pada form tambah/edit menu.
5. **Hapus Kategori menggantikan Nonaktifkan Kategori**: Mengubah "Nonaktifkan Kategori" menjadi "Hapus Kategori", serta menghilangkan kategori terhapus dari antarmuka pengguna.
6. **Dukungan Menu Paket**: Memperbaiki dan mengaktifkan penambahan "Menu Paket" (Combo Menu) yang terdiri dari kombinasi beberapa produk.

---

## 2. Keputusan Arsitektur Data & Schema DB

### A. Tabel `products` (Penambahan Kolom `unit` & Handling `active`)
- Tambahkan kolom `unit` pada schema `products` di `src/db/schema.ts`:
  ```typescript
  unit: text("unit").notNull().default("porsi")
  ```
- Kolom `costPrice` yang sudah ada pada `products` digunakan sebagai nilai **Harga Modal / HPP**.
- Produk yang "Dihapus" akan ditandai dengan `active: false` (atau `deletedAt`), dan query pembacaan katalog (`actionLoadCatalog`) **wajib menyaring** (`where active = true`) agar produk terhapus tidak muncul di UI Owner maupun Kasir.

### B. Relasi Varian, Add-on, dan Resep (Inventory)
- **Varian Produk**: Menggunakan tabel `product_variants` (`productId`, `name`, `priceDelta`, `sku`).
- **Add-on / Produk Ekstra**: Mengaitkan produk dengan `addons` melalui tabel pivot atau daftar ID addon terikat.
- **Resep (Inventory)**: Menggunakan tabel `recipes` dan `recipe_items` yang mengaitkan `productId` / `variantId` ke `inventory_items` dengan kuantitas pemakaian (`quantity`).

### C. Menu Paket
- Tambahkan kolom `type` pada `products`:
  ```typescript
  type: text("type", { enum: ["single", "package"] }).notNull().default("single")
  ```
- Buat tabel pivot `package_items` untuk menyimpan komposisi produk dalam satu menu paket:
  ```typescript
  export const packageItems = sqliteTable("package_items", {
    id: text("id").primaryKey(),
    packageProductId: text("package_product_id").notNull().references(() => products.id),
    itemProductId: text("item_product_id").notNull().references(() => products.id),
    quantity: integer("quantity").notNull().default(1),
  });
  ```

---

## 3. Matriks Matang Keputusan Per Poin Revisi

| Poin | Komponen Terdampak | Keputusan Teknis yang Dikunci |
|---|---|---|
| **#1 Import/Export** | `CatalogManager.tsx`, `catalog-actions.ts` | Export menggunakan parser CSV client-side (`downloadCsv`). Import menyediakan modal preview baris CSV sebelum dikirim ke server action `actionImportProducts`. |
| **#2 Hapus Menu** | `ProductTable`, `catalog-actions.ts` | Ganti tombol UI "Nonaktifkan" menjadi "Hapus Menu". Server action `actionDeleteProduct` mengubah status `active = false`. UI mengabaikan produk `active = false` dari list. |
| **#3 Varian, Ekstra, Resep** | `EditModal`, `schema.ts`, `catalog-actions.ts` | Perluas `EditModal` dengan Tab/Section: (1) General, (2) Varian, (3) Ekstra, (4) Resep Inventory. Form Resep menampilkan dropdown dari `inventory_items`. |
| **#4 Satuan & HPP** | `EditModal`, `ProductTable`, `schema.ts` | Tambahkan field input `unit` (Porsi, Pcs, dll) dan `costPrice` (HPP) pada modal produk. Tampilkan HPP & Satuan pada tabel produk Owner. |
| **#5 Hapus Kategori** | `CategoryTable`, `catalog-actions.ts` | Ganti tombol UI "Nonaktifkan Kategori" menjadi "Hapus Kategori". Kategori terhapus di-exclude dari list UI dan dropdown kategori produk. |
| **#6 Menu Paket** | `EditModal`, `schema.ts`, `catalog-actions.ts` | Tambahkan opsi Tipe Produk (`Biasa` vs `Paket`). Jika `Paket`, tampilkan selector produk-produk penyusun paket beserta jumlah porsinya. |

---

## 4. Kriteria Penerimaan UAT (Definition of Done)

1. **Import & Export Massal**:
   - Owner dapat mengklik tombol "Export CSV" dan mengunduh seluruh data produk aktif.
   - Owner dapat mengunggah file CSV valid, melihat preview data, dan menyimpan seluruh produk secara massal.
2. **Hapus Menu & Kategori**:
   - Menekan "Hapus" pada Menu atau Kategori akan memunculkan konfirmasi hapus.
   - Setelah dihapus, item tersebut seketika hilang dari tabel UI dan tidak lagi muncul di halaman Kasir.
3. **Modal Tambah/Edit Menu Lengkap**:
   - Modal memiliki pengisian Satuan & HPP (Harga Modal).
   - Modal mengizinkan penambahan varian harga (mis. Pedas +Rp 2.000).
   - Modal mengizinkan pemilihan resep bahan baku dari data Inventory.
4. **Menu Paket**:
   - Owner dapat membuat menu tipe Paket dan memilih produk-produk penyusunnya.
   - Menu Paket berhasil disimpan dan muncul di katalog produk.
