/**
 * Owner reports integration tests (Phase 10).
 *
 * Runs real Drizzle queries against in-memory SQLite with committed migrations.
 * These pin the report contract used by Owner Dashboard and report pages:
 * outlet scope, date ranges, reconciliation totals, product/category/cashier
 * slices, shift cash close, current inventory, and refund/void/discount/expense
 * visibility.
 */
import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import {
  roles,
  users,
  outlets,
  categories,
  products,
  shifts,
  cashMovements,
  orders,
  orderItems,
  payments,
  refunds,
  inventoryItems,
  outletStock,
} from "@/db/schema";
import { buildOwnerReport, type ReportsDb } from "@/lib/reports-data";

let db: ReportsDb;

function seedBase() {
  db.insert(roles).values({ id: "role_owner", name: "Owner" }).run();
  db.insert(users)
    .values([
      { id: "u_owner", name: "Owner", email: "owner@t.local", roleId: "role_owner" },
      { id: "u_sinta", name: "Sinta", email: "sinta@t.local", roleId: "role_owner" },
      { id: "u_rina", name: "Rina", email: "rina@t.local", roleId: "role_owner" },
    ])
    .run();
  db.insert(outlets)
    .values([
      { id: "outlet_a", name: "Kemang", code: "KMG" },
      { id: "outlet_b", name: "Senayan", code: "SNY" },
    ])
    .run();
  db.insert(categories)
    .values([
      { id: "cat_dimsum", name: "Dimsum", sortOrder: 1 },
      { id: "cat_drink", name: "Minuman", sortOrder: 2 },
    ])
    .run();
  db.insert(products)
    .values([
      { id: "prod_dimsum", categoryId: "cat_dimsum", name: "Dimsum Ayam", sku: "D-1", price: 50000 },
      { id: "prod_hakau", categoryId: "cat_dimsum", name: "Hakau Udang", sku: "H-1", price: 60000 },
      { id: "prod_tea", categoryId: "cat_drink", name: "Es Teh", sku: "T-1", price: 10000 },
    ])
    .run();
  db.insert(shifts)
    .values([
      {
        id: "shift_a",
        outletId: "outlet_a",
        cashierId: "u_sinta",
        status: "closed",
        openingCash: 100000,
        expectedCash: 196000,
        actualCash: 195000,
        cashDifference: -1000,
        openedAt: "2026-07-01T07:00:00.000Z",
        closedAt: "2026-07-01T16:00:00.000Z",
      },
      {
        id: "shift_b",
        outletId: "outlet_b",
        cashierId: "u_sinta",
        status: "closed",
        openingCash: 0,
        expectedCash: 99000,
        actualCash: 99000,
        cashDifference: 0,
        openedAt: "2026-07-01T07:00:00.000Z",
        closedAt: "2026-07-01T16:00:00.000Z",
      },
    ])
    .run();
  db.insert(inventoryItems)
    .values([
      { id: "inv_skin", name: "Kulit Dimsum", sku: "BB-001", category: "Bahan", unit: "pack", cost: 12000 },
      { id: "inv_chili", name: "Sambal", sku: "BB-002", category: "Bahan", unit: "kg", cost: 30000 },
    ])
    .run();
  db.insert(outletStock)
    .values([
      { id: "stock_a_skin", outletId: "outlet_a", inventoryItemId: "inv_skin", quantity: 8, minQuantity: 5 },
      { id: "stock_a_chili", outletId: "outlet_a", inventoryItemId: "inv_chili", quantity: 1, minQuantity: 2 },
      { id: "stock_b_skin", outletId: "outlet_b", inventoryItemId: "inv_skin", quantity: 99, minQuantity: 5 },
    ])
    .run();
}

function seedOrder(input: {
  id: string;
  no: string;
  outletId?: string;
  shiftId?: string;
  cashierId?: string;
  status?: "paid" | "refunded" | "void";
  total: number;
  subtotal?: number;
  tax?: number;
  discount?: number;
  method?: "cash" | "qris" | "transfer" | "ewallet";
  at: string;
  items?: Array<{ id: string; productId: string; name: string; sku: string; price: number; qty: number }>;
}) {
  db.insert(orders)
    .values({
      id: input.id,
      orderNo: input.no,
      outletId: input.outletId ?? "outlet_a",
      shiftId: input.shiftId ?? "shift_a",
      cashierId: input.cashierId ?? "u_sinta",
      orderType: "dinein",
      status: input.status ?? "paid",
      subtotal: input.subtotal ?? input.total,
      taxAmount: input.tax ?? 0,
      discountAmount: input.discount ?? 0,
      total: input.total,
      createdAt: input.at,
      updatedAt: input.at,
    })
    .run();
  db.insert(orderItems)
    .values(
      (input.items ?? []).map((item) => ({
        id: item.id,
        orderId: input.id,
        productId: item.productId,
        nameSnapshot: item.name,
        skuSnapshot: item.sku,
        priceSnapshot: item.price,
        quantity: item.qty,
      })),
    )
    .run();
  db.insert(payments)
    .values({
      id: `pay_${input.id}`,
      orderId: input.id,
      idempotencyKey: `idem_${input.id}`,
      method: input.method ?? "cash",
      amount: input.total,
      cashReceived: input.method === "cash" || !input.method ? input.total : null,
      status: "success",
      createdAt: input.at,
      updatedAt: input.at,
    })
    .run();
}

function seedReportData() {
  seedBase();
  seedOrder({
    id: "order_cash",
    no: "TRX-001",
    total: 111000,
    subtotal: 100000,
    tax: 11000,
    at: "2026-07-01T09:00:00.000Z",
    method: "cash",
    items: [{ id: "item_cash", productId: "prod_dimsum", name: "Dimsum Ayam", sku: "D-1", price: 50000, qty: 2 }],
  });
  seedOrder({
    id: "order_qris",
    no: "TRX-002",
    status: "refunded",
    total: 55000,
    subtotal: 60000,
    discount: 5000,
    at: "2026-07-02T10:00:00.000Z",
    method: "qris",
    items: [{ id: "item_qris", productId: "prod_hakau", name: "Hakau Udang", sku: "H-1", price: 60000, qty: 1 }],
  });
  seedOrder({
    id: "order_void",
    no: "TRX-003",
    status: "void",
    total: 30000,
    at: "2026-07-02T11:00:00.000Z",
    method: "cash",
    items: [{ id: "item_void", productId: "prod_tea", name: "Es Teh", sku: "T-1", price: 10000, qty: 3 }],
  });
  seedOrder({
    id: "order_other_outlet",
    no: "TRX-004",
    outletId: "outlet_b",
    shiftId: "shift_b",
    total: 99000,
    at: "2026-07-01T12:00:00.000Z",
    items: [{ id: "item_other_outlet", productId: "prod_dimsum", name: "Dimsum Ayam", sku: "D-1", price: 50000, qty: 2 }],
  });
  seedOrder({
    id: "order_outside_range",
    no: "TRX-005",
    total: 999000,
    at: "2026-06-30T23:00:00.000Z",
    items: [{ id: "item_outside", productId: "prod_dimsum", name: "Dimsum Ayam", sku: "D-1", price: 50000, qty: 2 }],
  });
  db.insert(refunds)
    .values({
      id: "refund_order_qris",
      orderId: "order_qris",
      amount: 20000,
      reason: "Kompensasi",
      actorId: "u_sinta",
      approvedById: "u_rina",
      createdAt: "2026-07-02T10:30:00.000Z",
      updatedAt: "2026-07-02T10:30:00.000Z",
    })
    .run();
  db.insert(cashMovements)
    .values({
      id: "expense_shift_a",
      shiftId: "shift_a",
      type: "expense",
      amount: 15000,
      note: "Beli es batu",
      actorId: "u_sinta",
      createdAt: "2026-07-01T13:00:00.000Z",
      updatedAt: "2026-07-01T13:00:00.000Z",
    })
    .run();
}

beforeEach(() => {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  db = drizzle(sqlite) as BetterSQLite3Database<Record<string, never>> as ReportsDb;
  migrate(db as never, { migrationsFolder: "./drizzle" });
  seedReportData();
});

const reportInput = {
  outletIds: ["outlet_a"],
  from: "2026-07-01T00:00:00.000Z",
  to: "2026-07-03T00:00:00.000Z",
};

describe("buildOwnerReport", () => {
  it("filters every sales number by outlet scope and date range, excluding voided sales from net sales", () => {
    const report = buildOwnerReport(db, reportInput);

    expect(report.summary).toMatchObject({
      grossSales: 166000,
      netSales: 146000,
      orderCount: 2,
      productsSold: 3,
      refundAmount: 20000,
      voidAmount: 30000,
      discountAmount: 5000,
      expenseAmount: 15000,
    });
    expect(report.dailySales.map((day) => [day.date, day.total, day.orders])).toEqual([
      ["2026-07-01", 111000, 1],
      ["2026-07-02", 55000, 1],
    ]);
  });

  it("aggregates product, category, cashier, and payment method reports from paid/refunded orders", () => {
    const report = buildOwnerReport(db, reportInput);

    expect(report.productSales.map((row) => [row.name, row.sold, row.revenue])).toEqual([
      ["Dimsum Ayam", 2, 100000],
      ["Hakau Udang", 1, 60000],
    ]);
    expect(report.categorySales).toEqual([{ name: "Dimsum", sold: 3, revenue: 160000 }]);
    expect(report.cashierSales).toEqual([{ cashierName: "Sinta", orders: 2, netSales: 146000 }]);
    expect(report.paymentMethods.map((row) => [row.method, row.total, row.count, row.percent])).toEqual([
      ["Tunai", 111000, 1, 67],
      ["QRIS", 55000, 1, 33],
    ]);
  });

  it("includes shift reconciliation, current inventory, and finance event reports", () => {
    const report = buildOwnerReport(db, reportInput);

    expect(report.shiftReconciliation).toEqual([
      {
        shiftId: "shift_a",
        outletName: "Kemang",
        cashierName: "Sinta",
        openedAt: "2026-07-01T07:00:00.000Z",
        closedAt: "2026-07-01T16:00:00.000Z",
        expectedCash: 196000,
        actualCash: 195000,
        cashDifference: -1000,
        status: "closed",
      },
    ]);
    expect(report.inventory.map((row) => [row.name, row.quantity, row.minQuantity, row.status, row.value])).toEqual([
      ["Kulit Dimsum", 8, 5, "ok", 96000],
      ["Sambal", 1, 2, "low", 30000],
    ]);
    expect(report.financeEvents.map((event) => [event.kind, event.amount, event.orderNo])).toEqual([
      ["refund", 20000, "TRX-002"],
      ["void", 30000, "TRX-003"],
      ["discount", 5000, "TRX-002"],
      ["expense", 15000, "Beli es batu"],
    ]);
  });

  it("returns empty report slices when the caller has no scoped outlets", () => {
    const report = buildOwnerReport(db, { ...reportInput, outletIds: [] });

    expect(report.summary.grossSales).toBe(0);
    expect(report.productSales).toEqual([]);
    expect(report.inventory).toEqual([]);
  });

  it("keeps the daily report under the PRD five-second limit for realistic local volume", () => {
    for (let i = 0; i < 500; i += 1) {
      seedOrder({
        id: `bulk_${i}`,
        no: `BULK-${i}`,
        total: 10000,
        at: "2026-07-01T14:00:00.000Z",
        method: "cash",
        items: [{ id: `bulk_item_${i}`, productId: "prod_tea", name: "Es Teh", sku: "T-1", price: 10000, qty: 1 }],
      });
    }

    const startedAt = performance.now();
    const report = buildOwnerReport(db, reportInput);
    const elapsedMs = performance.now() - startedAt;

    expect(report.summary.orderCount).toBe(502);
    expect(elapsedMs).toBeLessThan(5000);
  });
});
