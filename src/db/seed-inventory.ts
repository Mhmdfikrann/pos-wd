import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
  inventoryItems,
  outletStock,
  recipeItems,
  recipes,
  stockMovements,
} from "./schema";
import { SEED_INVENTORY_ITEMS, SEED_RECIPES } from "./inventory-data";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SeedInventoryDb = BetterSQLite3Database<any>;

export async function seedInventory(db: SeedInventoryDb, outletId: string) {
  for (const item of SEED_INVENTORY_ITEMS) {
    await db
      .insert(inventoryItems)
      .values({
        id: item.id,
        name: item.name,
        sku: item.sku,
        category: item.category,
        unit: item.unit,
        cost: item.cost,
        active: true,
      })
      .onConflictDoNothing();

    const stockId = `stock_${outletId}_${item.id}`;
    await db
      .insert(outletStock)
      .values({
        id: stockId,
        outletId,
        inventoryItemId: item.id,
        quantity: item.quantity,
        minQuantity: item.minQuantity,
      })
      .onConflictDoNothing();

    if (item.quantity > 0) {
      await db
        .insert(stockMovements)
        .values({
          id: `opening_${outletId}_${item.id}`,
          outletId,
          inventoryItemId: item.id,
          type: "in",
          quantity: item.quantity,
          note: "opening stock",
        })
        .onConflictDoNothing();
    }
  }

  for (const recipe of SEED_RECIPES) {
    if (recipe.items.length === 0) continue;

    const recipeId = `recipe_${recipe.productId}_v1`;
    await db
      .insert(recipes)
      .values({
        id: recipeId,
        productId: recipe.productId,
        version: 1,
        active: true,
      })
      .onConflictDoNothing();

    for (const item of recipe.items) {
      await db
        .insert(recipeItems)
        .values({
          id: `recipe_item_${recipe.productId}_${item.itemId}`,
          recipeId,
          inventoryItemId: item.itemId,
          quantity: item.quantity,
        })
        .onConflictDoNothing();
    }
  }
}
