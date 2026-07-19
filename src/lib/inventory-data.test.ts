/**
 * Inventory data integration tests (Phase 7).
 *
 * Runs real Drizzle queries against an in-memory SQLite database built from
 * committed migrations. These pin the stock ledger guarantees: outlet scoping,
 * no-negative-stock validation, manual adjustment movement rows, recipe-based
 * checkout deduction, rollback, and idempotent sale deduction.
 */
import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import {
  roles,
  users,
  outlets,
  categories,
  products,
  shifts,
  orders,
  orderItems,
  inventoryItems,
  outletStock,
  recipes,
  recipeItems,
  stockMovements,
} from "@/db/schema";
import {
  adjustStock,
  deductStockForOrder,
  listStock,
  type InventoryDb,
} from "@/lib/inventory-data";

let db: InventoryDb;

function seed() {
  db.insert(roles).values({ id: "role_inventory", name: "Inventory" }).run();
  db.insert(users)
    .values([
      { id: "u_inventory", name: "Dewi", email: "dewi@t.local", roleId: "role_inventory" },
      { id: "u_kasir", name: "Sinta", email: "sinta@t.local", roleId: "role_inventory" },
    ])
    .run();
  db.insert(outlets)
    .values([
      { id: "outlet_a", name: "Outlet A", code: "A" },
      { id: "outlet_b", name: "Outlet B", code: "B" },
    ])
    .run();
  db.insert(categories).values({ id: "cat_dimsum", name: "Dimsum", sortOrder: 1 }).run();
  db.insert(products)
    .values([
      { id: "prod_dimsum", categoryId: "cat_dimsum", name: "Dimsum Ayam", sku: "D-1", price: 18000 },
      { id: "prod_plain", categoryId: "cat_dimsum", name: "Produk Tanpa Resep", sku: "P-1", price: 10000 },
    ])
    .run();
  db.insert(shifts)
    .values({ id: "shift_a", outletId: "outlet_a", cashierId: "u_kasir", status: "open", openingCash: 0 })
    .run();
  db.insert(inventoryItems)
    .values([
      { id: "inv_skin", name: "Kulit Dimsum", sku: "BB-001", category: "bahan", unit: "pack", cost: 12000 },
      { id: "inv_chicken", name: "Daging Ayam", sku: "BB-002", category: "bahan", unit: "kg", cost: 45000 },
      { id: "inv_box", name: "Kemasan M", sku: "KM-001", category: "kemasan", unit: "pcs", cost: 1500 },
    ])
    .run();
  db.insert(outletStock)
    .values([
      { id: "stock_a_skin", outletId: "outlet_a", inventoryItemId: "inv_skin", quantity: 10, minQuantity: 5 },
      { id: "stock_a_chicken", outletId: "outlet_a", inventoryItemId: "inv_chicken", quantity: 4, minQuantity: 3 },
      { id: "stock_b_skin", outletId: "outlet_b", inventoryItemId: "inv_skin", quantity: 99, minQuantity: 5 },
    ])
    .run();
  db.insert(recipes).values({ id: "recipe_dimsum", productId: "prod_dimsum", version: 1, active: true }).run();
  db.insert(recipeItems)
    .values([
      { id: "ri_skin", recipeId: "recipe_dimsum", inventoryItemId: "inv_skin", quantity: 0.5 },
      { id: "ri_chicken", recipeId: "recipe_dimsum", inventoryItemId: "inv_chicken", quantity: 0.25 },
    ])
    .run();
}

function seedPaidOrder(orderId: string, productId = "prod_dimsum", quantity = 2) {
  db.insert(orders)
    .values({
      id: orderId,
      orderNo: `TRX-${orderId}`,
      outletId: "outlet_a",
      shiftId: "shift_a",
      cashierId: "u_kasir",
      orderType: "dinein",
      status: "paid",
      subtotal: 36000,
      taxAmount: 3960,
      total: 39960,
    })
    .run();
  db.insert(orderItems)
    .values({
      id: `item_${orderId}`,
      orderId,
      productId,
      nameSnapshot: "Dimsum Ayam",
      skuSnapshot: "D-1",
      priceSnapshot: 18000,
      quantity,
    })
    .run();
}

beforeEach(() => {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  db = drizzle(sqlite) as BetterSQLite3Database<Record<string, never>> as InventoryDb;
  migrate(db as never, { migrationsFolder: "./drizzle" });
  seed();
});

describe("listStock", () => {
  it("returns only stock rows for requested outlets with derived status and value", () => {
    const rows = listStock(db, { outletIds: ["outlet_a"] });

    expect(rows.map((row) => row.id)).toEqual(["stock_a_chicken", "stock_a_skin"]);
    expect(rows.find((row) => row.itemId === "inv_skin")).toMatchObject({
      outletId: "outlet_a",
      name: "Kulit Dimsum",
      sku: "BB-001",
      cat: "bahan",
      qty: 10,
      min: 5,
      status: "ok",
      value: 120000,
    });
    expect(rows.find((row) => row.itemId === "inv_chicken")?.status).toBe("ok");
  });

  it("returns an empty list when the caller has no outlet scope", () => {
    expect(listStock(db, { outletIds: [] })).toEqual([]);
  });
});

describe("adjustStock", () => {
  it("updates outlet stock and writes a matching movement row", () => {
    const row = adjustStock(db, {
      outletId: "outlet_a",
      itemId: "inv_skin",
      type: "in",
      quantity: 3,
      actorId: "u_inventory",
      note: "Restock pagi",
    });

    expect(row.qty).toBe(13);
    const movement = db.select().from(stockMovements).where(eq(stockMovements.inventoryItemId, "inv_skin")).get();
    expect(movement).toMatchObject({
      outletId: "outlet_a",
      type: "in",
      quantity: 3,
      actorId: "u_inventory",
      note: "Restock pagi",
    });
  });

  it("rejects negative stock and rolls back the movement", () => {
    expect(() =>
      adjustStock(db, {
        outletId: "outlet_a",
        itemId: "inv_chicken",
        type: "out",
        quantity: 99,
        actorId: "u_inventory",
      }),
    ).toThrow(/stok/i);

    const stock = db.select().from(outletStock).where(eq(outletStock.id, "stock_a_chicken")).get();
    expect(stock?.quantity).toBe(4);
    expect(db.select().from(stockMovements).all()).toHaveLength(0);
  });
});

describe("deductStockForOrder", () => {
  it("deducts active recipe ingredients for a paid order and is idempotent", () => {
    seedPaidOrder("order_1", "prod_dimsum", 2);

    const first = deductStockForOrder(db, { orderId: "order_1", actorId: "u_kasir" });
    const second = deductStockForOrder(db, { orderId: "order_1", actorId: "u_kasir" });

    expect(first.deducted).toBe(true);
    expect(second.deducted).toBe(false);
    expect(first.movements).toHaveLength(2);
    expect(db.select().from(stockMovements).where(eq(stockMovements.orderId, "order_1")).all()).toHaveLength(2);
    expect(db.select().from(outletStock).where(eq(outletStock.id, "stock_a_skin")).get()?.quantity).toBe(9);
    expect(db.select().from(outletStock).where(eq(outletStock.id, "stock_a_chicken")).get()?.quantity).toBe(3.5);
  });

  it("skips products without recipes", () => {
    seedPaidOrder("order_plain", "prod_plain", 3);

    const result = deductStockForOrder(db, { orderId: "order_plain", actorId: "u_kasir" });

    expect(result.deducted).toBe(false);
    expect(result.movements).toHaveLength(0);
    expect(db.select().from(stockMovements).all()).toHaveLength(0);
  });

  it("rejects insufficient stock without partial writes", () => {
    seedPaidOrder("order_big", "prod_dimsum", 20);

    expect(() => deductStockForOrder(db, { orderId: "order_big", actorId: "u_kasir" })).toThrow(/stok/i);

    expect(db.select().from(outletStock).where(eq(outletStock.id, "stock_a_skin")).get()?.quantity).toBe(10);
    expect(db.select().from(outletStock).where(eq(outletStock.id, "stock_a_chicken")).get()?.quantity).toBe(4);
    expect(db.select().from(stockMovements).where(eq(stockMovements.orderId, "order_big")).all()).toHaveLength(0);
  });
});
