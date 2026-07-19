/**
 * Inventory seed data-integrity tests (Phase 7).
 */
import { describe, it, expect } from "vitest";
import { SEED_PRODUCTS } from "./catalog-data";
import { SEED_INVENTORY_ITEMS, SEED_RECIPES } from "./inventory-data";

describe("seed inventory integrity", () => {
  it("has the 15 Inventory mockup SKU rows", () => {
    expect(SEED_INVENTORY_ITEMS).toHaveLength(15);
  });

  it("inventory ids and SKUs are unique", () => {
    const ids = SEED_INVENTORY_ITEMS.map((item) => item.id);
    const skus = SEED_INVENTORY_ITEMS.map((item) => item.sku);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(skus).size).toBe(skus.length);
  });

  it("initial stock and costs are non-negative", () => {
    for (const item of SEED_INVENTORY_ITEMS) {
      expect(item.quantity, item.id).toBeGreaterThanOrEqual(0);
      expect(item.minQuantity, item.id).toBeGreaterThanOrEqual(0);
      expect(item.cost, item.id).toBeGreaterThanOrEqual(0);
    }
  });

  it("every recipe references seeded catalog products and inventory items", () => {
    const productIds = new Set(SEED_PRODUCTS.map((product) => product.id));
    const itemIds = new Set(SEED_INVENTORY_ITEMS.map((item) => item.id));

    for (const recipe of SEED_RECIPES) {
      expect(productIds.has(recipe.productId), recipe.productId).toBe(true);
      for (const item of recipe.items) {
        expect(itemIds.has(item.itemId), `${recipe.productId} -> ${item.itemId}`).toBe(true);
        expect(item.quantity, `${recipe.productId} -> ${item.itemId}`).toBeGreaterThan(0);
      }
    }
  });

  it("keeps one recipe definition per product id", () => {
    const productIds = SEED_RECIPES.map((recipe) => recipe.productId);
    expect(new Set(productIds).size).toBe(productIds.length);
  });
});
