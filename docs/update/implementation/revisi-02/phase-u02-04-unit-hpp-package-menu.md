# Phase U02-04: Satuan, Harga Modal (HPP), dan Dukungan Menu Paket

> **Fokus**: Menambahkan input **Jenis Satuan** & **Harga Modal (HPP)** pada produk, serta menambahkan dukungan pembuatan **Menu Paket (Combo Menu)**.

---

## 1. Persyaratan & Ruang Lingkup

- **Field Jenis Satuan & Harga Modal (HPP)**:
  - Pada form **Informasi Umum Produk**, tambahkan:
    - **Jenis Satuan**: Dropdown / input text (pilihan default: `Porsi`, `Pcs`, `Piring`, `Mangkuk`, `Paket`, `Gelas`, `Box`).
    - **Harga Modal (HPP)**: Input integer Rupiah.
  - Tampilkan informasi HPP & Satuan pada tabel `ProductTable` Owner.

- **Dukungan Menu Paket (Combo Menu)**:
  - Tambahkan switch / dropdown pilihan **Tipe Menu**: `Menu Biasa` vs `Menu Paket`.
  - Jika `Menu Paket` dipilih:
    - Munculkan section **Isi Komponen Paket**: Tombol "Tambah Item Paket", di mana Owner dapat memilih produk-produk penyusun paket beserta jumlah porsi/unitnya.
    - Menghitung rekomendasi HPP paket secara otomatis dari akumulasi HPP item penyusunnya.
  - Memastikan Menu Paket tersimpan dengan benar dan dapat ditambahkan ke keranjang pesanan di halaman Kasir.

---

## 2. Rencana Perubahan Komponen & Berkas

1. **`src/db/schema.ts`**:
   - Tambahkan kolom `unit` pada `products`: `unit: text("unit").notNull().default("porsi")`.
   - Tambahkan kolom `type` pada `products`: `type: text("type", { enum: ["single", "package"] }).notNull().default("single")`.
   - Tambahkan tabel pivot `package_items` (`id`, `packageProductId`, `itemProductId`, `quantity`).

2. **`src/lib/catalog-actions.ts`**:
   - Update type `CatalogProduct` dan server action `actionCreateProduct` / `actionUpdateProduct` untuk menerima `unit`, `type`, dan `packageItems`.

3. **`src/components/owner/CatalogManager.tsx`**:
   - Tambahkan input field Satuan & HPP di `EditModal`.
   - Tambahkan section pemilih item komponen paket bila tipe `package` dipilih.

---

## 3. Kriteria Selesai (Definition of Done)

- [ ] Kolom Satuan (`unit`) dan HPP (`costPrice`) tersimpan di DB dan muncul pada form produk serta tabel produk.
- [ ] Fitur pembuatan Menu Paket berfungsi penuh: Owner dapat memilih item-item penyusun paket dan menyimpannya.
- [ ] Menu Paket berhasil ditampilkan dan dapat ditransaksikan di antarmuka Kasir.
