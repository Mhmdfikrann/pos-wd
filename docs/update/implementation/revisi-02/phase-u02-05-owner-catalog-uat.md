# Phase U02-05: Polishing UI Owner Catalog, Test & UAT Verifikasi

> **Fokus**: Melakukan penghalusan tampilan UI (*polish*), pengujian integrasi (*unit/integration testing*), serta pengujian skenario UAT lengkap untuk seluruh 6 poin Revisi 02.

---

## 1. Persyaratan & Ruang Lingkup

- **Polishing UI & Visual Consistency**:
  - Memastikan seluruh modal, tab, tombol, dan tabel pada `CatalogManager.tsx` mengikuti *Design Tokens* Wanna Dimsum (`#A91F34`, typography, micro-interactions, responsive table).
  - Memastikan transisi antar tab modal produk halus dan intuitif.

- **Pengujian (Automated & Manual Tests)**:
  - Membuat unit/integration test pada `src/lib/catalog-actions.test.ts` atau `src/db/seed-catalog.test.ts` untuk memverifikasi:
    - Batch Import CSV & Export CSV.
    - Penghapusan Menu & Kategori (filter status active).
    - Penyimpanan varian, HPP, satuan, resep inventory, dan menu paket.

- **Matriks Skenario UAT Revisi 02**:

| ID Test | Deskripsi Skenario | Hasil yang Diharapkan |
|---|---|---|
| **UAT-02-01** | Owner menekan "Export CSV" | File CSV terunduh berisi data produk aktif dengan kolom SKU, Nama, Kategori, Harga, HPP, Satuan. |
| **UAT-02-02** | Owner mengunggah file CSV baru | System memvalidasi data CSV, menampilkan preview, dan menyimpan produk secara massal. |
| **UAT-02-03** | Owner menekan "Hapus" pada suatu Menu | Konfirmasi hapus muncul. Setelah dikonfirmasi, menu hilang dari antarmuka Owner & Kasir. |
| **UAT-02-04** | Owner menekan "Hapus" pada suatu Kategori | Konfirmasi hapus muncul. Kategori terhapus hilang dari list dan dari dropdown pilihan kategori. |
| **UAT-02-05** | Owner menambah menu dengan Varian, Ekstra, dan Resep | Data varian, ekstra, dan resep bahan baku tersimpan presisi dan terhubung ke Inventory. |
| **UAT-02-06** | Owner mengisi Jenis Satuan & Harga Modal (HPP) | Satuan & HPP muncul di form dan pada tabel produk Owner. |
| **UAT-02-07** | Owner menambah Menu Paket (Combo) | Menu Paket tersimpan dengan item-item penyusunnya dan dapat diorder di Kasir. |

---

## 2. Kriteria Selesai (Definition of Done)

- [ ] Seluruh test Vitest (`npm test`) lulus tanpa error.
- [ ] Typecheck (`npm run typecheck`) & Linter (`npm run lint`) lulus 100%.
- [ ] Seluruh skenario UAT-02-01 s/d UAT-02-07 berhasil diverifikasi di lingkungan lokal/dev.
