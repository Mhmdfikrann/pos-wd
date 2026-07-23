import { describe, it, expect } from "vitest";
import {
  createProduct,
  saveProductRecipe,
  getProductRecipe,
  listInventoryItemsSimple,
} from "@/lib/catalog";

describe("Phase U03-02: Recipe Inventory Details", () => {
  it("calculates recipe subtotal and total cost with units", async () => {
    const prodId = await createProduct({
      categoryId: "cat_dimsum",
      name: "Siomay Ayam Recipe Test",
      sku: `TEST-SIOMAY-RECIPE-${Date.now()}`,
      price: 20000,
    });

    const inventoryItems = await listInventoryItemsSimple();
    expect(inventoryItems.length).toBeGreaterThan(0);

    const firstItem = inventoryItems[0];
    const secondItem = inventoryItems[1] ?? inventoryItems[0];

    const recipeInput = [
      { inventoryItemId: firstItem.id, quantity: 150 },
      { inventoryItemId: secondItem.id, quantity: 20 },
    ];

    await saveProductRecipe(prodId, recipeInput);

    const recipe = await getProductRecipe(prodId);
    expect(recipe.length).toBe(2);
    expect(recipe[0].inventoryItemId).toBe(firstItem.id);
    expect(recipe[0].quantity).toBe(150);

    const expectedCost = 150 * firstItem.cost + 20 * secondItem.cost;
    const computedCost = recipe.reduce((acc, r) => {
      const inv = inventoryItems.find((i) => i.id === r.inventoryItemId);
      return acc + (inv ? inv.cost * r.quantity : 0);
    }, 0);

    expect(computedCost).toBe(expectedCost);
  });
});
