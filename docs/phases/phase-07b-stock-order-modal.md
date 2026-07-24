# Phase 07b: Revamp Modal Pemesanan Stok (PO)

> Scope: Pembaruan Pop-up Modal Pemesanan Stok pada route `/owner/inventori/pembelian-stok/pemesanan-stok`.
> Memecah alur pemesanan stok menjadi 2-step wizard modal interaktif dengan integrasi ke Daftar Pemasok (`/owner/inventori/pembelian-stok/daftar-pemasok`) dan Kelola Stok / Daftar Stok (`/owner/inventori/kelola-stok/daftar-stok`).

## Scope & Flow Detail

### Step 1: Informasi Pemesanan Stok
1. **Jenis Pemesanan**:
   - `Pemesanan Barang Jual`
   - `Pemesanan Aset`
2. **Sumber Stok**:
   - `Tanpa Referensi`
   - `Referensikan Permintaan Barang` (Menampilkan dropdown referensi No. Permintaan / Requisition)
3. **Field Informasi Pemesanan Stok**:
   - **Daftar Outlet**: Selection dropdown outlet tujuan (misal: Outlet Utama - Jakarta, Cabang Bandung, Cabang Surabaya)
   - **Pemasok**: Linked ke data Pemasok (`/owner/inventori/pembelian-stok/daftar-pemasok`)
   - **Alamat Pemasok / Pengiriman**: Auto-fill sesuai Pemasok & Outlet yang dipilih (dapat diedit)
   - **Nomor Pemesanan Stok**: Auto-generated oleh sistem (misal: `PO-2026-090`)
   - **Tanggal Pemesanan Stok**: Date input/picker
4. **Navigasi**:
   - Tombol **"Selanjutnya"** memvalidasi Step 1 dan berpindah ke Step 2.

---

### Step 2: Detail Pemesanan Stok
1. **Rincian Barang & Tombol "Atur Barang"**:
   - Tombol **"Atur Barang"** membuka Modal Selector Barang dari Inventori (`/owner/inventori/kelola-stok/daftar-stok`).
   - Tabel Rincian Barang:
     - Kolom: `Barang` | `Jumlah` | `Satuan` | `Harga Satuan` | `Diskon` | `Total`
     - Per-item row details: Nama barang, catatan item, diskon per item (Jenis Diskon: Nominal/Persen, Nilai Diskon).
2. **Form Transaksi & Kalkulasi Finansial (Footer / Sidebar Rincian)**:
   - **Pajak**: Jenis Pajak (Non-Pajak / Inklusi / Eksklusi / Persen %), Nominal Pajak.
   - **Biaya Lainnya**: Daftar komponen biaya tambahan (misal: Biaya Penanganan, Biaya Admin) + Tombol **"Tambah Biaya Lainnya"**.
   - **Ongkir**: Input nominal ongkos kirim.
   - **Uang Muka (DP)**: Input nominal uang muka yang dibayarkan awal.
   - **Ringkasan Kalkulasi Real-Time (Integer Rupiah)**:
     - `Subtotal Barang`
     - `Total Diskon`
     - `Tanpa Pajak (Subtotal setelah diskon, sebelum pajak)`
     - `Total Pajak`
     - `Ongkir`
     - `Total Biaya Lainnya`
     - `Total Harga (Grand Total)`
     - `Sisa Tagihan (Grand Total - Uang Muka)`
3. **Navigasi & Aksike**:
   - Tombol **"Kembali"** ke Step 1.
   - Tombol **"Simpan Pemesanan"** / **"Buat PO"** untuk menyimpan transaksi ke state utama & menambahkannya ke tabel PO.

---

## Acceptance Criteria & Definition of Done
- Modal Step 1 & Step 2 berfungsi tanpa error.
- "Atur Barang" modal memungkinkan pencarian, seleksi multiple item stok dari inventory (`daftar-stok`), dan penyesuaian kuantitas/harga/diskon per item.
- Kalkulasi otomatis `Subtotal`, `Diskon`, `Pajak`, `Ongkir`, `Biaya Lainnya`, `Total Harga`, dan `Sisa Tagihan` tepat & konsisten dalam integer Rupiah.
- Typecheck `npm run typecheck` dan build `npm run test` / `npm run build` berjalan dengan bersih.
