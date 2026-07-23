# Phase U03-02: Rincian Resep Inventory (Harga Modal, Takaran, Satuan)

> **Fokus**: Memperjelas tampilan dan struktur pengisian pada sub-tab Resep Inventory di Modal Produk dengan menyajikan kolom **Harga Modal**, **Takaran**, dan **Satuan** secara presisi.

---

## 1. Persyaratan & Ruang Lingkup

1. **Struktur Kolom Sub-tab Resep Inventory**:
   - Tampilkan baris resep dengan kolom yang terstruktur dan jelas:
     - **Bahan Baku**: Select/dropdown nama item inventory.
     - **Harga Modal / Unit Cost**: Menampilkan biaya per unit (misal: `Rp 50 / gram`).
     - **Takaran (Jumlah Pemakaian)**: Input numeric (misal: `150`).
     - **Satuan**: Label satuan otomatis dari bahan baku (misal: `gram`).
     - **Subtotal HPP Bahan**: Hasil perkalian `(Takaran × Harga Modal)`.

2. **Kalkulasi Estimasi HPP**:
   - Memastikan penjumlahan otomatis total HPP dari seluruh bahan baku resep berfungsi akurat.
   - Tombol **"Gunakan HPP Ini"** memperbarui nilai `costPrice` pada produk secara otomatis.

---

## 2. Rencana Perubahan Komponen & Berkas

1. **`src/components/owner/CatalogManager.tsx`**:
   - Perbarui tampilan UI pada sub-tab **Resep Inventory** di `EditModal` agar menampilkan rincian Harga Modal, Takaran, Satuan, dan Subtotal HPP per baris bahan baku.

---

## 3. Kriteria Selesai (Definition of Done)

- [ ] Sub-tab Resep Inventory menampilkan Harga Modal, Takaran, dan Satuan dengan jelas.
- [ ] Subtotal HPP per bahan baku dan total HPP resep terkalkulasi secara otomatis.
- [ ] Typecheck (`npm run typecheck`) & Vitest (`npm test`) lulus tanpa error.
