# Phase U03-00: Data Schema & Migrations

> **Fokus**: Menyesuaikan skema database Drizzle ORM (`src/db/schema.ts`) untuk mendukung atribut baru pada Add-on, Produk, Produk Paket, dan tabel pivot relasi Add-on ke Produk.

---

## 1. Persyaratan & Ruang Lingkup

1. **Atribut Baru pada Tabel `addons`**:
   - `isMandatory: integer("is_mandatory", { mode: "boolean" }).notNull().default(false)` (Wajib vs Opsional).
   - `selectMode: text("select_mode", { enum: ["single", "multiple"] }).notNull().default("multiple")` (Pilih salah satu vs pilih beberapa).

2. **Atribut Baru pada Tabel `products`**:
   - `minOrder: integer("min_order").notNull().default(1)` (Minimal pembelian).
   - `isFavorite: integer("is_favorite", { mode: "boolean" }).notNull().default(false)` (Checklist Produk Favorit).
   - `showInBar: integer("show_in_bar", { mode: "boolean" }).notNull().default(false)` (Checklist Tampil di Bar/Station).
   - `onlinePrices: text("online_prices", { mode: "json" })` (JSON data harga Ojek Online per platform: GoFood, GrabFood, ShopeeFood).

3. **Tabel Pivot `product_addons`**:
   - Menghubungkan produk dengan produk ekstra yang berlaku.
   - Kolom: `id`, `productId`, `addonId`.

4. **Drizzle Migration**:
   - Generate file SQL migration baru menggunakan `npx drizzle-kit generate`.

---

## 2. Rencana Perubahan Komponen & Berkas

1. **`src/db/schema.ts`**:
   - Tambahkan kolom baru pada `addons` dan `products`.
   - Buat definisi tabel `productAddons`.
2. **`drizzle/`**:
   - File SQL migration baru hasil generate `drizzle-kit`.
3. **`src/lib/catalog.ts`**:
   - Perbarui tipe `CatalogProduct` & `Addon` agar mencakup field baru ini.

---

## 3. Kriteria Selesai (Definition of Done)

- [ ] Skema DB pada `schema.ts` ter-update tanpa merusak tabel/kolom yang ada.
- [ ] SQL migration berhasil dibuat via `drizzle-kit generate`.
- [ ] `npm run db:seed` berhasil dijalankan tanpa error.
