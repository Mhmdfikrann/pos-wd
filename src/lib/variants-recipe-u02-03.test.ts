import { describe, it, expect } from "vitest";
import { getProductRecipe, saveProductRecipe, listInventoryItemsSimple } from "@/lib/catalog";

describe("Phase U02-03: Variants, Addons, and Recipe Linkage", () => {
  it("exports recipe and inventory data functions", () => {
    expect(typeof listInventoryItemsSimple).toBe("function");
    expect(typeof getProductRecipe).toBe("function");
    expect(typeof saveProductRecipe).toBe("function");
  });
});
