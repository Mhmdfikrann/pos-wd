/**
 * Catalog seed data — PURE constants, no DB import, so it's unit-testable
 * without a live env / SQLite file. `seed-catalog.ts` consumes these to write
 * rows; tests assert on them directly.
 *
 * The data is the Kasir mockup's own catalog (`src/app/kasir/page.tsx`
 * PRODUCTS/CATS) so the DB-backed screen matches the visual source of truth.
 * Product ids are kept verbatim (d1…a3) because the Kasir initial cart seeds
 * against `d1`/`h1`/`m1` — changing them would break that screen.
 *
 * Station mapping is the one locked in Phase 0 (verified against the Kitchen
 * mockup): dimsum/kukus/paket → Kukus, goreng → Goreng, minuman → Minuman,
 * add-on → null (condiments, no kitchen prep).
 *
 * Money is integer rupiah (BR-002). Availability maps from the mockup stock tag
 * (ok/low → available, out → unavailable).
 */

/** Category rows — `all` is a UI filter, not a row (Phase 0). */
export const SEED_CATEGORIES = [
  { id: "cat_dimsum", name: "Dimsum", sortOrder: 1 },
  { id: "cat_kukus", name: "Kukus", sortOrder: 2 },
  { id: "cat_goreng", name: "Goreng", sortOrder: 3 },
  { id: "cat_paket", name: "Paket", sortOrder: 4 },
  { id: "cat_minuman", name: "Minuman", sortOrder: 5 },
  { id: "cat_addon", name: "Add-on", sortOrder: 6 },
] as const;

/** Which kitchen station prepares each category (Phase 0, null = no prep). */
export const STATION: Record<string, string | null> = {
  cat_dimsum: "Kukus",
  cat_kukus: "Kukus",
  cat_paket: "Kukus",
  cat_goreng: "Goreng",
  cat_minuman: "Minuman",
  cat_addon: null,
};

export interface SeedProduct {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  sku: string;
  /** false only for the mockup's "out" tag (Lumpia Kulit Tahu). */
  available?: boolean;
}

/** 20 products, ids + prices verbatim from the Kasir mockup. */
export const SEED_PRODUCTS: SeedProduct[] = [
  { id: "d1", name: "Dimsum Ayam", price: 18000, categoryId: "cat_dimsum", sku: "WD-DIM-01" },
  { id: "d2", name: "Dimsum Ayam Keju", price: 22000, categoryId: "cat_dimsum", sku: "WD-DIM-02" },
  { id: "d3", name: "Siomay Ayam", price: 20000, categoryId: "cat_dimsum", sku: "WD-DIM-03" },
  { id: "d4", name: "Ceker Dimsum", price: 24000, categoryId: "cat_dimsum", sku: "WD-DIM-04" },
  { id: "h1", name: "Hakau Udang", price: 24000, categoryId: "cat_kukus", sku: "WD-KUK-01" },
  { id: "h2", name: "Xiao Long Bao", price: 28000, categoryId: "cat_kukus", sku: "WD-KUK-02" },
  { id: "h3", name: "Mantao Kukus", price: 16000, categoryId: "cat_kukus", sku: "WD-KUK-03" },
  { id: "g1", name: "Lumpia Udang", price: 20000, categoryId: "cat_goreng", sku: "WD-GOR-01" },
  { id: "g2", name: "Pangsit Goreng", price: 18000, categoryId: "cat_goreng", sku: "WD-GOR-02" },
  { id: "g3", name: "Lumpia Kulit Tahu", price: 20000, categoryId: "cat_goreng", sku: "WD-GOR-03", available: false },
  { id: "p1", name: "Paket Hemat A", price: 45000, categoryId: "cat_paket", sku: "WD-PKT-01" },
  { id: "p2", name: "Paket Berdua", price: 78000, categoryId: "cat_paket", sku: "WD-PKT-02" },
  { id: "p3", name: "Paket Keluarga", price: 145000, categoryId: "cat_paket", sku: "WD-PKT-03" },
  { id: "m1", name: "Es Teh Melati", price: 7000, categoryId: "cat_minuman", sku: "WD-MIN-01" },
  { id: "m2", name: "Es Jeruk", price: 10000, categoryId: "cat_minuman", sku: "WD-MIN-02" },
  { id: "m3", name: "Teh Tarik", price: 12000, categoryId: "cat_minuman", sku: "WD-MIN-03" },
  { id: "m4", name: "Air Mineral", price: 5000, categoryId: "cat_minuman", sku: "WD-MIN-04" },
  { id: "a1", name: "Saus XO", price: 8000, categoryId: "cat_addon", sku: "WD-ADD-01" },
  { id: "a2", name: "Sambal Extra", price: 3000, categoryId: "cat_addon", sku: "WD-ADD-02" },
  { id: "a3", name: "Kecap Asin", price: 2000, categoryId: "cat_addon", sku: "WD-ADD-03" },
];
