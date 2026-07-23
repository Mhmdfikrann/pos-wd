# Phase U03-04: Halaman Pengaturan "Harga Ojek Online"

> **Fokus**: Menambahkan item navigasi baru pada **Sidebar Owner > Produk > Harga Ojek Online** serta membuat halaman/komponen khusus untuk mengelola harga produk di platform delivery online (GoFood, GrabFood, ShopeeFood).

---

## 1. Persyaratan & Ruang Lingkup

1. **Integrasi Sidebar Owner (`src/components/owner/nav.ts` / Owner shell)**:
   - Tambahkan sub-menu **"Harga Ojek Online"** di bawah section **Produk / Katalog** pada sidebar Owner.

2. **Halaman Pengelolaan Harga Ojek Online (`OnlinePricingManager.tsx`)**:
   - Menampilkan daftar seluruh produk aktif.
   - Kolom tabel: Nama Produk, SKU, Harga Reguler (Kasir/Dine-in), Harga GoFood, Harga GrabFood, Harga ShopeeFood.
   - Opsi Pengaturan Cepat / Mark-up Massal (misal: "Mark-up +20%" atau "Mark-up +Rp 3.000" untuk seluruh platform).
   - Edit inline / modal edit harga platform online per produk.
   - Tombol "Simpan Perubahan Harga Ojek Online".

3. **Server Action Simpan Harga Ojol**:
   - `actionSaveOnlinePrices(productId, onlinePrices)` atau batch update.

---

## 2. Rencana Perubahan Komponen & Berkas

1. **`src/components/owner/nav.ts`**:
   - Tambahkan route / state key `"harga-ojol"` pada daftar menu Owner.
2. **`src/components/owner/OnlinePricingManager.tsx`** (Baru):
   - Komponen UI untuk pengelolaan harga Ojek Online.
3. **`src/components/owner/OwnerShell.tsx`**:
   - Hubungkan render halaman `"harga-ojol"` ke `OnlinePricingManager`.
4. **`src/lib/catalog-actions.ts`**:
   - Tambahkan Server Action `actionUpdateOnlinePrices`.

---

## 3. Kriteria Selesai (Definition of Done)

- [ ] Sidebar Owner memiliki menu "Harga Ojek Online".
- [ ] Halaman `OnlinePricingManager` tampil native mengikuti *design system* Wanna Dimsum POS.
- [ ] Pengaturan harga GoFood, GrabFood, ShopeeFood tersimpan di database dan dapat dibaca kembali.
- [ ] Typecheck (`npm run typecheck`) & Vitest (`npm test`) lulus tanpa error.
