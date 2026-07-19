/**
 * Inventory seed data — pure constants consumed by `seed-inventory.ts`.
 *
 * Items mirror the Inventory mockup's 15 SKU rows. Recipe quantities are
 * operational starter data for Phase 7 stock deduction; they intentionally use
 * the catalog product ids from `catalog-data.ts`.
 */

export type SeedInventoryCategory = "bahan" | "kemasan" | "minuman" | "operasional";

export interface SeedInventoryItem {
  id: string;
  name: string;
  sku: string;
  category: SeedInventoryCategory;
  quantity: number;
  minQuantity: number;
  unit: string;
  cost: number;
}

export interface SeedRecipe {
  productId: string;
  items: { itemId: string; quantity: number }[];
}

export const SEED_INVENTORY_ITEMS: SeedInventoryItem[] = [
  { id: "inv_kulit_dimsum", name: "Kulit Dimsum", sku: "BB-001", category: "bahan", quantity: 48, minQuantity: 30, unit: "pack", cost: 12000 },
  { id: "inv_daging_ayam", name: "Daging Ayam Giling", sku: "BB-002", category: "bahan", quantity: 14, minQuantity: 20, unit: "kg", cost: 45000 },
  { id: "inv_udang", name: "Udang Kupas", sku: "BB-003", category: "bahan", quantity: 6, minQuantity: 10, unit: "kg", cost: 95000 },
  { id: "inv_tapioka", name: "Tepung Tapioka", sku: "BB-004", category: "bahan", quantity: 60, minQuantity: 25, unit: "kg", cost: 14000 },
  { id: "inv_jamur_kuping", name: "Jamur Kuping Kering", sku: "BB-005", category: "bahan", quantity: 0, minQuantity: 8, unit: "kg", cost: 38000 },
  { id: "inv_saus_xo", name: "Saus XO", sku: "BB-006", category: "bahan", quantity: 22, minQuantity: 12, unit: "botol", cost: 28000 },
  { id: "inv_minyak", name: "Minyak Goreng", sku: "BB-007", category: "bahan", quantity: 18, minQuantity: 10, unit: "liter", cost: 20000 },
  { id: "inv_kemasan_m", name: "Kemasan Takeaway M", sku: "KM-001", category: "kemasan", quantity: 320, minQuantity: 200, unit: "pcs", cost: 1500 },
  { id: "inv_kemasan_l", name: "Kemasan Takeaway L", sku: "KM-002", category: "kemasan", quantity: 140, minQuantity: 200, unit: "pcs", cost: 2200 },
  { id: "inv_paper_bag", name: "Paper Bag Bermerek", sku: "KM-003", category: "kemasan", quantity: 90, minQuantity: 100, unit: "pcs", cost: 1200 },
  { id: "inv_cutlery", name: "Sumpit + Sendok Set", sku: "KM-004", category: "kemasan", quantity: 800, minQuantity: 300, unit: "set", cost: 500 },
  { id: "inv_teh_melati", name: "Teh Melati Kering", sku: "MN-001", category: "minuman", quantity: 25, minQuantity: 10, unit: "pack", cost: 22000 },
  { id: "inv_sirup_jeruk", name: "Sirup Jeruk", sku: "MN-002", category: "minuman", quantity: 8, minQuantity: 6, unit: "botol", cost: 26000 },
  { id: "inv_gas_lpg", name: "Gas LPG 12kg", sku: "OP-001", category: "operasional", quantity: 3, minQuantity: 2, unit: "tabung", cost: 210000 },
  { id: "inv_tisu", name: "Tisu Makan", sku: "OP-002", category: "operasional", quantity: 0, minQuantity: 12, unit: "pack", cost: 9000 },
];

export const SEED_RECIPES: SeedRecipe[] = [
  { productId: "d1", items: [{ itemId: "inv_kulit_dimsum", quantity: 0.1 }, { itemId: "inv_daging_ayam", quantity: 0.12 }, { itemId: "inv_tapioka", quantity: 0.03 }] },
  { productId: "d2", items: [{ itemId: "inv_kulit_dimsum", quantity: 0.1 }, { itemId: "inv_daging_ayam", quantity: 0.14 }, { itemId: "inv_tapioka", quantity: 0.03 }] },
  { productId: "d3", items: [{ itemId: "inv_kulit_dimsum", quantity: 0.1 }, { itemId: "inv_daging_ayam", quantity: 0.12 }, { itemId: "inv_udang", quantity: 0.03 }] },
  { productId: "d4", items: [{ itemId: "inv_daging_ayam", quantity: 0.18 }, { itemId: "inv_saus_xo", quantity: 0.03 }] },
  { productId: "h1", items: [{ itemId: "inv_kulit_dimsum", quantity: 0.1 }, { itemId: "inv_udang", quantity: 0.12 }, { itemId: "inv_tapioka", quantity: 0.03 }] },
  { productId: "h2", items: [{ itemId: "inv_kulit_dimsum", quantity: 0.12 }, { itemId: "inv_daging_ayam", quantity: 0.1 }, { itemId: "inv_udang", quantity: 0.05 }] },
  { productId: "h3", items: [{ itemId: "inv_tapioka", quantity: 0.12 }] },
  { productId: "g1", items: [{ itemId: "inv_kulit_dimsum", quantity: 0.1 }, { itemId: "inv_udang", quantity: 0.1 }, { itemId: "inv_minyak", quantity: 0.04 }] },
  { productId: "g2", items: [{ itemId: "inv_kulit_dimsum", quantity: 0.1 }, { itemId: "inv_daging_ayam", quantity: 0.1 }, { itemId: "inv_minyak", quantity: 0.04 }] },
  { productId: "g3", items: [{ itemId: "inv_jamur_kuping", quantity: 0.08 }, { itemId: "inv_minyak", quantity: 0.04 }] },
  { productId: "p1", items: [{ itemId: "inv_kulit_dimsum", quantity: 0.3 }, { itemId: "inv_daging_ayam", quantity: 0.26 }, { itemId: "inv_udang", quantity: 0.1 }] },
  { productId: "p2", items: [{ itemId: "inv_kulit_dimsum", quantity: 0.5 }, { itemId: "inv_daging_ayam", quantity: 0.42 }, { itemId: "inv_udang", quantity: 0.18 }] },
  { productId: "p3", items: [{ itemId: "inv_kulit_dimsum", quantity: 0.9 }, { itemId: "inv_daging_ayam", quantity: 0.8 }, { itemId: "inv_udang", quantity: 0.35 }] },
  { productId: "m1", items: [{ itemId: "inv_teh_melati", quantity: 0.03 }] },
  { productId: "m2", items: [{ itemId: "inv_sirup_jeruk", quantity: 0.08 }] },
  { productId: "m3", items: [{ itemId: "inv_teh_melati", quantity: 0.04 }] },
  { productId: "m4", items: [] },
  { productId: "a1", items: [{ itemId: "inv_saus_xo", quantity: 0.05 }] },
  { productId: "a2", items: [{ itemId: "inv_saus_xo", quantity: 0.02 }] },
  { productId: "a3", items: [{ itemId: "inv_saus_xo", quantity: 0.01 }] },
];
