/**
 * Inventory data access (Phase 7).
 *
 * DB-parameterized so integration tests can run against in-memory SQLite with
 * real migrations. The server-only wrapper binds these functions to the app DB.
 */
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
  inventoryItems,
  orderItems,
  orders,
  outletStock,
  recipeItems,
  recipes,
  stockMovements,
} from "@/db/schema";
import {
  assertNonNegative,
  movementQuantity,
  nextQuantity,
  normalizeStockCategory,
  stockStatus,
  type ManualMovementType,
  type StockCategory,
  type StockStatus,
} from "@/lib/inventory-core";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InventoryDb = BetterSQLite3Database<any>;

export interface StockView {
  id: string;
  outletId: string;
  itemId: string;
  name: string;
  sku: string;
  cat: StockCategory;
  qty: number;
  min: number;
  unit: string;
  cost: number;
  exp: number | null;
  status: StockStatus;
  value: number;
}

export interface ListStockInput {
  outletIds: string[];
}

export interface AdjustStockInput {
  outletId: string;
  itemId: string;
  type: ManualMovementType;
  quantity: number;
  actorId: string;
  note?: string | null;
}

export interface DeductStockForOrderInput {
  orderId: string;
  actorId?: string | null;
}

export interface DeductStockMovement {
  inventoryItemId: string;
  quantity: number;
}

export interface DeductStockResult {
  deducted: boolean;
  movements: DeductStockMovement[];
}

export function listStock(db: InventoryDb, input: ListStockInput): StockView[] {
  if (input.outletIds.length === 0) return [];

  const rows = db
    .select({
      id: outletStock.id,
      outletId: outletStock.outletId,
      itemId: inventoryItems.id,
      name: inventoryItems.name,
      sku: inventoryItems.sku,
      category: inventoryItems.category,
      quantity: outletStock.quantity,
      minQuantity: outletStock.minQuantity,
      unit: inventoryItems.unit,
      cost: inventoryItems.cost,
    })
    .from(outletStock)
    .innerJoin(inventoryItems, eq(outletStock.inventoryItemId, inventoryItems.id))
    .where(and(inArray(outletStock.outletId, input.outletIds), eq(inventoryItems.active, true)))
    .orderBy(asc(inventoryItems.name), asc(inventoryItems.sku))
    .all();

  return rows.map(toStockView);
}

export function adjustStock(db: InventoryDb, input: AdjustStockInput): StockView {
  return db.transaction((tx) => {
    const current = tx
      .select()
      .from(outletStock)
      .where(and(eq(outletStock.outletId, input.outletId), eq(outletStock.inventoryItemId, input.itemId)))
      .get();
    if (!current) {
      throw new Error("Stok outlet untuk item ini tidak ditemukan.");
    }

    const movementQty = movementQuantity(input.type, current.quantity, input.quantity);
    const updatedQty = nextQuantity(current.quantity, input.type, input.quantity);

    tx.update(outletStock)
      .set({ quantity: updatedQty })
      .where(eq(outletStock.id, current.id))
      .run();

    tx.insert(stockMovements)
      .values({
        id: randomUUID(),
        outletId: input.outletId,
        inventoryItemId: input.itemId,
        type: input.type,
        quantity: movementQty,
        note: input.note ?? null,
        actorId: input.actorId,
      })
      .run();

    return getStockViewById(tx, current.id);
  });
}

export function deductStockForOrder(db: InventoryDb, input: DeductStockForOrderInput): DeductStockResult {
  return db.transaction((tx) => deductStockForOrderInTransaction(tx, input));
}

export function deductStockForOrderInTransaction(
  db: InventoryDb,
  input: DeductStockForOrderInput,
): DeductStockResult {
  const existing = db
    .select({ id: stockMovements.id })
    .from(stockMovements)
    .where(and(eq(stockMovements.orderId, input.orderId), eq(stockMovements.type, "sale_deduction")))
    .get();
  if (existing) return { deducted: false, movements: [] };

  const order = db.select().from(orders).where(eq(orders.id, input.orderId)).get();
  if (!order) throw new Error("Order tidak ditemukan untuk pemotongan stok.");
  if (order.status !== "paid") throw new Error("Stok hanya dipotong untuk order berstatus paid.");

  const items = db
    .select({
      productId: orderItems.productId,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, input.orderId))
    .all()
    .filter((item): item is { productId: string; quantity: number } => Boolean(item.productId));

  if (items.length === 0) return { deducted: false, movements: [] };

  const productIds = [...new Set(items.map((item) => item.productId))];
  const activeRecipes = db
    .select({
      id: recipes.id,
      productId: recipes.productId,
    })
    .from(recipes)
    .where(and(inArray(recipes.productId, productIds), eq(recipes.active, true)))
    .orderBy(desc(recipes.version), asc(recipes.id))
    .all();

  const recipeByProduct = new Map<string, string>();
  for (const recipe of activeRecipes) {
    if (!recipeByProduct.has(recipe.productId)) {
      recipeByProduct.set(recipe.productId, recipe.id);
    }
  }

  const recipeIds = [...recipeByProduct.values()];
  if (recipeIds.length === 0) return { deducted: false, movements: [] };

  const ingredients = db
    .select({
      recipeId: recipeItems.recipeId,
      inventoryItemId: recipeItems.inventoryItemId,
      quantity: recipeItems.quantity,
    })
    .from(recipeItems)
    .where(inArray(recipeItems.recipeId, recipeIds))
    .all();

  const ingredientsByRecipe = new Map<string, typeof ingredients>();
  for (const ingredient of ingredients) {
    const list = ingredientsByRecipe.get(ingredient.recipeId) ?? [];
    list.push(ingredient);
    ingredientsByRecipe.set(ingredient.recipeId, list);
  }

  const required = new Map<string, number>();
  for (const item of items) {
    const recipeId = recipeByProduct.get(item.productId);
    if (!recipeId) continue;
    for (const ingredient of ingredientsByRecipe.get(recipeId) ?? []) {
      required.set(
        ingredient.inventoryItemId,
        (required.get(ingredient.inventoryItemId) ?? 0) + ingredient.quantity * item.quantity,
      );
    }
  }

  const movements = [...required.entries()]
    .filter(([, quantity]) => quantity > 0)
    .map(([inventoryItemId, quantity]) => ({ inventoryItemId, quantity }));
  if (movements.length === 0) return { deducted: false, movements: [] };

  const stockRows = db
    .select()
    .from(outletStock)
    .where(and(eq(outletStock.outletId, order.outletId), inArray(outletStock.inventoryItemId, movements.map((m) => m.inventoryItemId))))
    .all();
  const stockByItem = new Map(stockRows.map((stock) => [stock.inventoryItemId, stock]));

  for (const movement of movements) {
    const stock = stockByItem.get(movement.inventoryItemId);
    if (!stock) throw new Error("Stok bahan resep tidak ditemukan di outlet ini.");
    assertNonNegative(stock.quantity - movement.quantity);
  }

  for (const movement of movements) {
    const stock = stockByItem.get(movement.inventoryItemId);
    if (!stock) throw new Error("Stok bahan resep tidak ditemukan di outlet ini.");
    db.update(outletStock)
      .set({ quantity: stock.quantity - movement.quantity })
      .where(eq(outletStock.id, stock.id))
      .run();
    db.insert(stockMovements)
      .values({
        id: randomUUID(),
        outletId: order.outletId,
        inventoryItemId: movement.inventoryItemId,
        type: "sale_deduction",
        quantity: -movement.quantity,
        note: `Deduksi order ${order.orderNo}`,
        orderId: order.id,
        actorId: input.actorId ?? order.cashierId,
      })
      .run();
  }

  return { deducted: true, movements };
}

function getStockViewById(db: InventoryDb, stockId: string): StockView {
  const row = db
    .select({
      id: outletStock.id,
      outletId: outletStock.outletId,
      itemId: inventoryItems.id,
      name: inventoryItems.name,
      sku: inventoryItems.sku,
      category: inventoryItems.category,
      quantity: outletStock.quantity,
      minQuantity: outletStock.minQuantity,
      unit: inventoryItems.unit,
      cost: inventoryItems.cost,
    })
    .from(outletStock)
    .innerJoin(inventoryItems, eq(outletStock.inventoryItemId, inventoryItems.id))
    .where(eq(outletStock.id, stockId))
    .get();
  if (!row) throw new Error("Stok outlet tidak ditemukan.");
  return toStockView(row);
}

function toStockView(row: {
  id: string;
  outletId: string;
  itemId: string;
  name: string;
  sku: string;
  category: string | null;
  quantity: number;
  minQuantity: number;
  unit: string;
  cost: number;
}): StockView {
  return {
    id: row.id,
    outletId: row.outletId,
    itemId: row.itemId,
    name: row.name,
    sku: row.sku,
    cat: normalizeStockCategory(row.category),
    qty: row.quantity,
    min: row.minQuantity,
    unit: row.unit,
    cost: row.cost,
    exp: null,
    status: stockStatus(row.quantity, row.minQuantity),
    value: row.quantity * row.cost,
  };
}
