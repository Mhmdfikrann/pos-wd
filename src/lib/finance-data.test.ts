/**
 * Refund / void / manual discount integration tests (Phase 9).
 *
 * Runs real Drizzle queries against in-memory SQLite with committed migrations.
 * These pin approval-first financial mutations: refund caps, manager approval,
 * preserved order history, void reversal, manual-discount approval, and
 * outlet-scoped approval reads.
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
  refunds,
  orderItems,
} from "@/db/schema";
import {
  approveManualDiscount,
  approveRefund,
  approveVoid,
  listApprovalRequests,
  requestManualDiscount,
  requestRefund,
  requestVoid,
  type FinanceDb,
} from "@/lib/finance-data";

let db: FinanceDb;

function seed() {
  db.insert(roles).values({ id: "role_manager", name: "Manager" }).run();
  db.insert(users)
    .values([
      { id: "u_kasir", name: "Sinta", email: "sinta@t.local", roleId: "role_manager" },
      { id: "u_manager", name: "Rina", email: "rina@t.local", roleId: "role_manager" },
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
    .values({ id: "prod_dimsum", categoryId: "cat_dimsum", name: "Dimsum", sku: "D-1", price: 50000 })
    .run();
  db.insert(shifts)
    .values([
      { id: "shift_a", outletId: "outlet_a", cashierId: "u_kasir", status: "open", openingCash: 0 },
      { id: "shift_b", outletId: "outlet_b", cashierId: "u_kasir", status: "open", openingCash: 0 },
    ])
    .run();
  db.insert(orders)
    .values([
      {
        id: "order_a",
        orderNo: "TRX-A",
        outletId: "outlet_a",
        shiftId: "shift_a",
        cashierId: "u_kasir",
        orderType: "dinein",
        status: "paid",
        subtotal: 100000,
        taxAmount: 11000,
        total: 111000,
      },
      {
        id: "order_b",
        orderNo: "TRX-B",
        outletId: "outlet_b",
        shiftId: "shift_b",
        cashierId: "u_kasir",
        orderType: "takeaway",
        status: "paid",
        subtotal: 50000,
        taxAmount: 5500,
        total: 55500,
      },
    ])
    .run();
  db.insert(orderItems)
    .values({
      id: "item_a",
      orderId: "order_a",
      productId: "prod_dimsum",
      nameSnapshot: "Dimsum",
      skuSnapshot: "D-1",
      priceSnapshot: 50000,
      quantity: 2,
    })
    .run();
  db.insert(payments)
    .values([
      {
        id: "pay_a",
        orderId: "order_a",
        idempotencyKey: "pay-a",
        method: "cash",
        amount: 111000,
        cashReceived: 111000,
        status: "success",
      },
      {
        id: "pay_b",
        orderId: "order_b",
        idempotencyKey: "pay-b",
        method: "cash",
        amount: 55500,
        cashReceived: 55500,
        status: "success",
      },
    ])
    .run();
}

beforeEach(() => {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  db = drizzle(sqlite) as BetterSQLite3Database<Record<string, never>> as FinanceDb;
  migrate(db as never, { migrationsFolder: "./drizzle" });
  seed();
});

describe("refund approval flow", () => {
  it("creates a pending refund request, then approval records refund with actor, reason, approver, and audit event", () => {
    const request = requestRefund(db, {
      orderId: "order_a",
      amount: 40000,
      reason: "Pelanggan komplain",
      requestedById: "u_kasir",
    });

    expect(request.status).toBe("pending");
    expect(db.select().from(refunds).all()).toHaveLength(0);

    const approved = approveRefund(db, {
      requestId: request.id,
      approverId: "u_manager",
      outletIds: ["outlet_a"],
    });

    expect(approved.refund).toMatchObject({
      orderId: "order_a",
      amount: 40000,
      reason: "Pelanggan komplain",
      actorId: "u_kasir",
      approvedById: "u_manager",
    });
    expect(approved.auditEvents.map((event) => event.action)).toEqual(["refund.approve"]);
  });

  it("rejects refund requests above the paid amount not yet refunded or pending", () => {
    requestRefund(db, {
      orderId: "order_a",
      amount: 60000,
      reason: "Pending pertama",
      requestedById: "u_kasir",
    });

    expect(() =>
      requestRefund(db, {
        orderId: "order_a",
        amount: 60000,
        reason: "Melebihi sisa",
        requestedById: "u_kasir",
      }),
    ).toThrow(/refund/i);
  });
});

describe("void approval flow", () => {
  it("voids an order after approval without deleting original order, items, or payment history", () => {
    const request = requestVoid(db, {
      orderId: "order_a",
      reason: "Salah input transaksi",
      requestedById: "u_kasir",
    });

    const approved = approveVoid(db, {
      requestId: request.id,
      approverId: "u_manager",
      outletIds: ["outlet_a"],
    });

    expect(approved.order.status).toBe("void");
    expect(approved.auditEvents.map((event) => event.action)).toEqual(["void.approve"]);
    expect(db.select().from(orders).where(eq(orders.id, "order_a")).get()).toBeTruthy();
    expect(db.select().from(orderItems).where(eq(orderItems.orderId, "order_a")).all()).toHaveLength(1);
    expect(db.select().from(payments).where(eq(payments.orderId, "order_a")).all()).toHaveLength(1);
  });
});

describe("manual discount approval flow", () => {
  it("applies a manager-approved manual discount and writes an audit event", () => {
    const request = requestManualDiscount(db, {
      orderId: "order_a",
      amount: 10000,
      reason: "Kompensasi pelanggan",
      requestedById: "u_kasir",
    });

    const approved = approveManualDiscount(db, {
      requestId: request.id,
      approverId: "u_manager",
      outletIds: ["outlet_a"],
    });

    expect(approved.order.discountAmount).toBe(10000);
    expect(approved.order.total).toBe(101000);
    expect(approved.auditEvents.map((event) => event.action)).toEqual(["discount.apply"]);
  });
});

describe("approval queue scope", () => {
  it("lists and approves only requests inside the manager outlet scope", () => {
    const a = requestRefund(db, {
      orderId: "order_a",
      amount: 10000,
      reason: "Outlet A",
      requestedById: "u_kasir",
    });
    requestRefund(db, {
      orderId: "order_b",
      amount: 10000,
      reason: "Outlet B",
      requestedById: "u_kasir",
    });

    expect(listApprovalRequests(db, { outletIds: ["outlet_a"] }).map((req) => req.id)).toEqual([a.id]);
    expect(() =>
      approveRefund(db, {
        requestId: a.id,
        approverId: "u_manager",
        outletIds: ["outlet_b"],
      }),
    ).toThrow(/outlet/i);
  });
});
