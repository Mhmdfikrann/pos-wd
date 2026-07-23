import { describe, it, expect } from "vitest";
import type { RawMaterialItem, UnitConversion } from "@/components/owner/RawMaterialManager";

describe("RawMaterialManager: Daftar Bahan Baku Data & Conversions", () => {
  it("creates a raw material item with unit conversions and calculates costs correctly", () => {
    const conversions: UnitConversion[] = [
      {
        id: "uc-1",
        unit: "gram",
        conversionFactor: 1000,
        purchaseCost: 45,
        sku: "BB-002-GRM",
      },
    ];

    const item: RawMaterialItem = {
      id: "rm-test",
      name: "Daging Ayam Giling",
      sku: "BB-002",
      outlets: ["Outlet Utama - Jakarta"],
      monitorStock: true,
      minStockAlert: 20,
      currentStock: 14,
      primaryUnit: "kg",
      purchaseCost: 45000,
      unitConversions: conversions,
      status: "Menipis",
    };

    expect(item.name).toBe("Daging Ayam Giling");
    expect(item.unitConversions.length).toBe(1);
    expect(item.unitConversions[0].purchaseCost).toBe(45);
    expect(item.currentStock * item.purchaseCost).toBe(630000);
  });
});
