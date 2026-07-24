import { formatRupiah } from "./format";

export interface StockItem {
  id: string;
  code: string;
  name: string;
  category: "Bahan Baku" | "Kemasan" | "Operasional" | "Aset";
  outlet: string;
  unit: string;
  stockAwal: number;
  stockMasuk: number;
  stockKeluar: number;
  stockTerproduksi: number;
  stockTerjual: number;
  stockTerbuang: number;
  stockTransit: number;
  currentStock: number;
  minStock: number;
  defaultPrice: number;
  lastUpdated?: string;
}

export const INITIAL_STOCK_ITEMS: StockItem[] = [
  {
    id: "stk-1",
    code: "BB-001",
    name: "Kulit Dimsum",
    category: "Bahan Baku",
    outlet: "Outlet Utama - Jakarta",
    unit: "pack",
    stockAwal: 20,
    stockMasuk: 30,
    stockKeluar: 5,
    stockTerproduksi: 15,
    stockTerjual: 25,
    stockTerbuang: 1,
    stockTransit: 2,
    currentStock: 32,
    minStock: 10,
    defaultPrice: 18000,
  },
  {
    id: "stk-2",
    code: "BB-002",
    name: "Daging Ayam Giling",
    category: "Bahan Baku",
    outlet: "Outlet Utama - Jakarta",
    unit: "kg",
    stockAwal: 10,
    stockMasuk: 20,
    stockKeluar: 4,
    stockTerproduksi: 0,
    stockTerjual: 10,
    stockTerbuang: 2,
    stockTransit: 0,
    currentStock: 14,
    minStock: 20,
    defaultPrice: 45000,
  },
  {
    id: "stk-3",
    code: "BB-003",
    name: "Udang Kupas Fresh",
    category: "Bahan Baku",
    outlet: "Outlet Utama - Jakarta",
    unit: "kg",
    stockAwal: 5,
    stockMasuk: 10,
    stockKeluar: 2,
    stockTerproduksi: 0,
    stockTerjual: 6,
    stockTerbuang: 1,
    stockTransit: 0,
    currentStock: 6,
    minStock: 10,
    defaultPrice: 95000,
  },
  {
    id: "stk-4",
    code: "BB-005",
    name: "Jamur Kuping Kering",
    category: "Bahan Baku",
    outlet: "Outlet Utama - Jakarta",
    unit: "kg",
    stockAwal: 2,
    stockMasuk: 5,
    stockKeluar: 1,
    stockTerproduksi: 0,
    stockTerjual: 4,
    stockTerbuang: 2,
    stockTransit: 0,
    currentStock: 0,
    minStock: 8,
    defaultPrice: 60000,
  },
  {
    id: "stk-5",
    code: "KM-002",
    name: "Kemasan Takeaway L",
    category: "Kemasan",
    outlet: "Outlet Utama - Jakarta",
    unit: "pcs",
    stockAwal: 100,
    stockMasuk: 100,
    stockKeluar: 10,
    stockTerproduksi: 0,
    stockTerjual: 45,
    stockTerbuang: 5,
    stockTransit: 0,
    currentStock: 140,
    minStock: 200,
    defaultPrice: 2200,
  },
  {
    id: "stk-6",
    code: "OP-001",
    name: "Gas LPG 12kg Refill",
    category: "Operasional",
    outlet: "Cabang Bandung",
    unit: "tabung",
    stockAwal: 3,
    stockMasuk: 5,
    stockKeluar: 3,
    stockTerproduksi: 0,
    stockTerjual: 0,
    stockTerbuang: 0,
    stockTransit: 0,
    currentStock: 5,
    minStock: 2,
    defaultPrice: 210000,
  },
  {
    id: "stk-7",
    code: "AS-001",
    name: "Freezer Commercial 4 Door",
    category: "Aset",
    outlet: "Outlet Utama - Jakarta",
    unit: "unit",
    stockAwal: 2,
    stockMasuk: 0,
    stockKeluar: 0,
    stockTerproduksi: 0,
    stockTerjual: 0,
    stockTerbuang: 0,
    stockTransit: 0,
    currentStock: 2,
    minStock: 1,
    defaultPrice: 14500000,
  },
];

export function getStoredStockItems(): StockItem[] {
  if (typeof window === "undefined") return INITIAL_STOCK_ITEMS;
  const saved = localStorage.getItem("pos_wd_inventory_stock_items");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}
  }
  return INITIAL_STOCK_ITEMS;
}

export function saveStoredStockItems(items: StockItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("pos_wd_inventory_stock_items", JSON.stringify(items));
  window.dispatchEvent(new Event("pos_wd_stock_updated"));
}

export function syncRawMaterialsToStock(
  rawMaterials: Array<{
    id: string;
    name: string;
    sku: string;
    outlets: string[];
    minStockAlert: number;
    currentStock: number;
    primaryUnit: string;
    purchaseCost: number;
  }>
): void {
  const currentStocks = getStoredStockItems();
  const updatedStocks = [...currentStocks];

  for (const rm of rawMaterials) {
    const outletName = rm.outlets && rm.outlets.length > 0 ? rm.outlets[0] : "Outlet Utama - Jakarta";
    const idx = updatedStocks.findIndex(
      (s) => s.code === rm.sku || s.name.toLowerCase() === rm.name.toLowerCase()
    );

    if (idx >= 0) {
      updatedStocks[idx] = {
        ...updatedStocks[idx],
        code: rm.sku,
        name: rm.name,
        outlet: outletName,
        unit: rm.primaryUnit,
        minStock: rm.minStockAlert,
        defaultPrice: rm.purchaseCost > 0 ? rm.purchaseCost : updatedStocks[idx].defaultPrice,
        lastUpdated: new Date().toISOString().slice(0, 10),
      };
    } else {
      updatedStocks.unshift({
        id: `stk-${rm.id}`,
        code: rm.sku,
        name: rm.name,
        category: "Bahan Baku",
        outlet: outletName,
        unit: rm.primaryUnit,
        stockAwal: 0,
        stockMasuk: rm.currentStock,
        stockKeluar: 0,
        stockTerproduksi: 0,
        stockTerjual: 0,
        stockTerbuang: 0,
        stockTransit: 0,
        currentStock: rm.currentStock,
        minStock: rm.minStockAlert,
        defaultPrice: rm.purchaseCost,
        lastUpdated: new Date().toISOString().slice(0, 10),
      });
    }
  }

  saveStoredStockItems(updatedStocks);
}

export function addOrIncrementStockItems(
  receivedItems: Array<{
    code?: string;
    name: string;
    qty: number;
    unitPrice?: number;
    unit?: string;
    category?: "Bahan Baku" | "Kemasan" | "Operasional" | "Aset";
    outlet?: string;
  }>
): void {
  const current = getStoredStockItems();
  const updated = [...current];

  for (const r of receivedItems) {
    const idx = updated.findIndex(
      (s) => (r.code && s.code === r.code) || s.name.toLowerCase() === r.name.toLowerCase()
    );
    if (idx >= 0) {
      updated[idx] = {
        ...updated[idx],
        stockMasuk: (updated[idx].stockMasuk || 0) + r.qty,
        currentStock: updated[idx].currentStock + r.qty,
        defaultPrice: r.unitPrice && r.unitPrice > 0 ? r.unitPrice : updated[idx].defaultPrice,
        lastUpdated: new Date().toISOString().slice(0, 10),
      };
    } else {
      updated.unshift({
        id: `stk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        code: r.code || `STK-${String(updated.length + 1).padStart(3, "0")}`,
        name: r.name,
        category: r.category || "Bahan Baku",
        outlet: r.outlet || "Outlet Utama - Jakarta",
        unit: r.unit || "pcs",
        stockAwal: 0,
        stockMasuk: r.qty,
        stockKeluar: 0,
        stockTerproduksi: 0,
        stockTerjual: 0,
        stockTerbuang: 0,
        stockTransit: 0,
        currentStock: r.qty,
        minStock: 10,
        defaultPrice: r.unitPrice || 0,
        lastUpdated: new Date().toISOString().slice(0, 10),
      });
    }
  }

  saveStoredStockItems(updated);
}
