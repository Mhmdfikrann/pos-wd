/**
 * Checkout integration tests (Phase 5 DoD — critical flow).
 *
 * Runs the REAL checkout transaction against an in-memory SQLite built from the
 * committed migrations, so these exercise the actual SQL, constraints, and the
 * one-transaction guarantee — not a mock. Covers the DoD-required cases:
 * double-payment (idempotency), rollback on failure, and "paid can't re-pay".
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
  payments,
  orderItems,
  kitchenTickets,
  inventoryItems,
  outletStock,
  recipes,
  recipeItems,
  stockMovements,
} from "@/db/schema";
import { checkout, type CheckoutDb, type CheckoutInput } from "@/lib/order-core";

let db: CheckoutDb;

function seed() {
  db.insert(roles).values({ id: "role_kasir", name: "Kasir" }).run();
  db.insert(users)
    .values({ id: "u1", name: "Kasir Satu", email: "k1@t.local", roleId: "role_kasir" })
    .run();
  db.insert(outlets).values({ id: "o1", name: "Outlet 1", code: "O1" }).run();
  db.insert(categories).values({ id: "c1", name: "Dimsum", sortOrder: 1 }).run();
  db.insert(products)
    .values([
      { id: "p1", categoryId: "c1", name: "Dimsum Ayam", sku: "D-1", price: 18000, costPrice: 6000 },
      { id: "p2", categoryId: "c1", name: "Hakau", sku: "H-1", price: 24000, costPrice: 9000 },
      { id: "pOut", categoryId: "c1", name: "Habis", sku: "X-1", price: 10000, available: false },
    ])
    .run();
  db.insert(shifts)
    .values({ id: "s1", outletId: "o1", cashierId: "u1", status: "open", openingCash: 100000 })
    .run();
}

function baseInput(overrides: Partial<CheckoutInput> = {}): CheckoutInput {
  return {
    outletId: "o1",
    shiftId: "s1",
    cashierId: "u1",
    cart: [{ productId: "p1", quantity: 2 }],
    orderType: "dinein",
    taxPercent: 11,
    payment: { method: "cash", cashReceived: 50000 },
    idempotencyKey: "key-1",
    ...overrides,
  };
}

beforeEach(() => {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  db = drizzle(sqlite) as BetterSQLite3Database<Record<string, never>> as CheckoutDb;
  migrate(db as never, { migrationsFolder: "./drizzle" });
  seed();
});

describe("checkout — totals & snapshots", () => {
  it("computes integer-rupiah totals (subtotal + 11% tax)", () => {
    const r = checkout(db, baseInput());
    // 2 × 18000 = 36000; tax 11% = 3960; total 39960
    expect(r.subtotal).toBe(36000);
    expect(r.taxAmount).toBe(3960);
    expect(r.total).toBe(39960);
    expect(r.payment.changeAmount).toBe(50000 - 39960);
    expect(Number.isInteger(r.taxAmount)).toBe(true);
  });

  it("snapshots name/sku/price/cost at sale time (BR-004)", () => {
    const r = checkout(db, baseInput());
    const items = db.select().from(orderItems).where(eq(orderItems.orderId, r.orderId)).all();
    expect(items).toHaveLength(1);
    expect(items[0].nameSnapshot).toBe("Dimsum Ayam");
    expect(items[0].skuSnapshot).toBe("D-1");
    expect(items[0].priceSnapshot).toBe(18000);
    expect(items[0].costSnapshot).toBe(6000);
    // Snapshot survives a later price change.
    db.update(products).set({ price: 99000 }).where(eq(products.id, "p1")).run();
    expect(db.select().from(orderItems).where(eq(orderItems.orderId, r.orderId)).all()[0].priceSnapshot).toBe(18000);
  });

  it("uses server price, ignoring any client-supplied amount", () => {
    // The cart only carries productId + quantity; price is read from the DB.
    const r = checkout(db, baseInput({ cart: [{ productId: "p2", quantity: 1 }], idempotencyKey: "k-price" }));
    expect(r.subtotal).toBe(24000);
  });
});

describe("checkout — idempotency (BR-003)", () => {
  it("replays the same receipt for a repeated idempotency key, no double charge", () => {
    const first = checkout(db, baseInput());
    const second = checkout(db, baseInput()); // same key-1
    expect(second.orderId).toBe(first.orderId);
    expect(second.replayed).toBe(true);
    // Exactly one order + one payment exist.
    expect(db.select().from(orders).all()).toHaveLength(1);
    expect(db.select().from(payments).all()).toHaveLength(1);
  });

  it("distinct keys create distinct orders", () => {
    checkout(db, baseInput({ idempotencyKey: "a" }));
    checkout(db, baseInput({ idempotencyKey: "b" }));
    expect(db.select().from(orders).all()).toHaveLength(2);
    expect(db.select().from(payments).all()).toHaveLength(2);
  });
});

describe("checkout — atomic rollback (BR-007)", () => {
  it("cash < total throws and writes NOTHING (full rollback)", () => {
    expect(() =>
      checkout(db, baseInput({ payment: { method: "cash", cashReceived: 1000 } })),
    ).toThrow();
    // No partial order/items/payment/ticket.
    expect(db.select().from(orders).all()).toHaveLength(0);
    expect(db.select().from(orderItems).all()).toHaveLength(0);
    expect(db.select().from(payments).all()).toHaveLength(0);
    expect(db.select().from(kitchenTickets).all()).toHaveLength(0);
  });

  it("unknown product throws and rolls back", () => {
    expect(() =>
      checkout(db, baseInput({ cart: [{ productId: "nope", quantity: 1 }], idempotencyKey: "k2" })),
    ).toThrow(/tidak ditemukan/);
    expect(db.select().from(orders).all()).toHaveLength(0);
  });

  it("unavailable product throws and rolls back", () => {
    expect(() =>
      checkout(db, baseInput({ cart: [{ productId: "pOut", quantity: 1 }], idempotencyKey: "k3" })),
    ).toThrow(/tidak tersedia/);
    expect(db.select().from(orders).all()).toHaveLength(0);
  });
});

describe("checkout — shift gate (BR-008)", () => {
  it("rejects when the shift is closed", () => {
    db.update(shifts).set({ status: "closed" }).where(eq(shifts.id, "s1")).run();
    expect(() => checkout(db, baseInput({ idempotencyKey: "k4" }))).toThrow(/shift terbuka/i);
    expect(db.select().from(orders).all()).toHaveLength(0);
  });
});

describe("checkout — exactly-once kitchen ticket", () => {
  it("creates exactly one kitchen ticket per paid order", () => {
    const r = checkout(db, baseInput());
    const tickets = db.select().from(kitchenTickets).where(eq(kitchenTickets.orderId, r.orderId)).all();
    expect(tickets).toHaveLength(1);
    expect(tickets[0].status).toBe("new");
  });
});

describe("checkout — inventory deduction (Phase 7)", () => {
  function seedRecipeStock() {
    db.insert(inventoryItems)
      .values([
        { id: "inv_skin", name: "Kulit Dimsum", sku: "BB-001", category: "bahan", unit: "pack", cost: 12000 },
        { id: "inv_chicken", name: "Daging Ayam", sku: "BB-002", category: "bahan", unit: "kg", cost: 45000 },
      ])
      .run();
    db.insert(outletStock)
      .values([
        { id: "stock_skin", outletId: "o1", inventoryItemId: "inv_skin", quantity: 10, minQuantity: 5 },
        { id: "stock_chicken", outletId: "o1", inventoryItemId: "inv_chicken", quantity: 4, minQuantity: 3 },
      ])
      .run();
    db.insert(recipes).values({ id: "recipe_p1", productId: "p1", version: 1, active: true }).run();
    db.insert(recipeItems)
      .values([
        { id: "ri_skin", recipeId: "recipe_p1", inventoryItemId: "inv_skin", quantity: 0.5 },
        { id: "ri_chicken", recipeId: "recipe_p1", inventoryItemId: "inv_chicken", quantity: 0.25 },
      ])
      .run();
  }

  it("deducts recipe stock inside checkout and replays without double deduction", () => {
    seedRecipeStock();

    const first = checkout(db, baseInput({ cart: [{ productId: "p1", quantity: 2 }] }));
    const second = checkout(db, baseInput({ cart: [{ productId: "p1", quantity: 2 }] }));

    expect(second.orderId).toBe(first.orderId);
    expect(db.select().from(stockMovements).where(eq(stockMovements.orderId, first.orderId)).all()).toHaveLength(2);
    expect(db.select().from(outletStock).where(eq(outletStock.id, "stock_skin")).get()?.quantity).toBe(9);
    expect(db.select().from(outletStock).where(eq(outletStock.id, "stock_chicken")).get()?.quantity).toBe(3.5);
  });

  it("rolls back checkout when recipe stock is insufficient", () => {
    seedRecipeStock();
    db.update(outletStock).set({ quantity: 0.2 }).where(eq(outletStock.id, "stock_skin")).run();

    expect(() =>
      checkout(db, baseInput({ cart: [{ productId: "p1", quantity: 2 }], idempotencyKey: "stock-fail" })),
    ).toThrow(/stok/i);

    expect(db.select().from(orders).all()).toHaveLength(0);
    expect(db.select().from(payments).all()).toHaveLength(0);
    expect(db.select().from(kitchenTickets).all()).toHaveLength(0);
    expect(db.select().from(stockMovements).all()).toHaveLength(0);
    expect(db.select().from(outletStock).where(eq(outletStock.id, "stock_skin")).get()?.quantity).toBe(0.2);
  });
});

describe("checkout — empty cart", () => {
  it("rejects an empty cart", () => {
    expect(() => checkout(db, baseInput({ cart: [] }))).toThrow(/kosong/i);
  });
});
