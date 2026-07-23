# Phase U03-01: Produk Ekstra (Wajib/Opsional, Pilih 1/Beberapa & Link Produk)

> **Fokus**: Memperbarui form pengelolaan Produk Ekstra (Add-on) dengan pengaturan Jenis Ekstra (Wajib/Opsional) dan Cara Pilih (Satu/Beberapa), serta menambahkan sub-tab penautan Produk Ekstra pada modal Tambah/Edit Produk.

---

## 1. Persyaratan & Ruang Lingkup

1. **Pengaturan pada Form Add-on (`AddonTable` / `EditModal` kind === "addon")**:
   - Tambahkan radio/select **Jenis Ekstra**: `Wajib (Mandatory)` vs `Opsional (Optional)`.
   - Tambahkan radio/select **Cara Pilih**: `Pilih Salah Satu (Single)` vs `Pilih Beberapa (Multiple)`.
   - Tampilkan badge / info Jenis & Cara Pilih pada `AddonTable`.

2. **Sub-tab "Produk Ekstra (Add-on)" pada Form Tambah/Edit Produk**:
   - Pada `EditModal` (kind === "produk"), tambahkan sub-tab **"Produk Ekstra (Add-on)"**.
   - Menampilkan daftar produk ekstra aktif dengan checklist untuk memilih add-on mana saja yang berlaku untuk menu ini.
   - Menyimpan dan memuat relasi `product_addons` via server action.

---

## 2. Rencana Perubahan Komponen & Berkas

1. **`src/lib/catalog.ts` & `src/lib/catalog-actions.ts`**:
   - Tambahkan fungsi `getProductAddons(productId)` dan `saveProductAddons(productId, addonIds)`.
   - Update `actionCreateAddon` dan `actionUpdateAddon` untuk menyimpan `isMandatory` dan `selectMode`.
2. **`src/components/owner/CatalogManager.tsx`**:
   - Update `AddonTable` untuk menampilkan kolom Jenis & Cara Pilih.
   - Update `EditModal` untuk mencakup input jenis/cara pilih pada addon dan sub-tab Add-on pada produk.

---

## 3. Kriteria Selesai (Definition of Done)

- [ ] Modal Add-on mendukung pengisian Jenis Ekstra (Wajib/Opsional) & Cara Pilih (1/Beberapa).
- [ ] Sub-tab Produk Ekstra pada modal produk berfungsi memilih dan menyimpan add-on terikat.
- [ ] Typecheck (`npm run typecheck`) & Vitest (`npm test`) lulus tanpa error.
