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
  customerMembers,
  customerPointEvents,
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
  method?: "cash" | "qris" | "transfer" | "ewallet" | "card";
  provider?: string | null;
  channelLabel?: string | null;
  orderType?: "dinein" | "takeaway" | "delivery";
  deliveryProvider?: "gofood" | "grabfood" | "shopeefood" | null;
  channelOrderName?: string | null;
  promoName?: string | null;
  customerMemberId?: string | null;
  customerPhone?: string | null;
  splitPayments?: Array<{ id: string; method: "cash" | "qris" | "transfer" | "ewallet" | "card"; amount: number; provider?: string | null; channelLabel?: string | null; referenceNo?: string | null; cashReceived?: number | null; changeAmount?: number | null }>;
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
      orderType: input.orderType ?? "dinein",
      deliveryProvider: input.deliveryProvider ?? null,
      channelOrderName: input.channelOrderName ?? null,
      promoNameSnapshot: input.promoName ?? null,
      customerMemberId: input.customerMemberId ?? null,
      customerPhone: input.customerPhone ?? null,
      status: input.status ?? "paid",
      subtotal: input.subtotal ?? input.total,
      taxAmount: input.tax ?? 0,
      discountAmount: input.discount ?? 0,
      total: input.total,
      createdAt: input.at,
      updatedAt: input.at,
    })
    .run();
  const itemValues = (input.items ?? []).map((item) => ({
    id: item.id,
    orderId: input.id,
    productId: item.productId,
    nameSnapshot: item.name,
    skuSnapshot: item.sku,
    priceSnapshot: item.price,
    quantity: item.qty,
  }));
  if (itemValues.length) db.insert(orderItems).values(itemValues).run();
  const paymentValues = input.splitPayments?.length
    ? input.splitPayments.map((payment, idx) => ({
        id: payment.id,
        orderId: input.id,
        idempotencyKey: `idem_${input.id}_${idx + 1}`,
        requestIdempotencyKey: `idem_${input.id}`,
        lineNo: idx + 1,
        method: payment.method,
        provider: payment.provider ?? null,
        channelLabel: payment.channelLabel ?? null,
        referenceNo: payment.referenceNo ?? null,
        amount: payment.amount,
        cashReceived: payment.cashReceived ?? (payment.method === "cash" ? payment.amount : null),
        changeAmount: payment.changeAmount ?? null,
        status: "success" as const,
        createdAt: input.at,
        updatedAt: input.at,
      }))
    : [{
        id: `pay_${input.id}`,
        orderId: input.id,
        idempotencyKey: `idem_${input.id}`,
        requestIdempotencyKey: `idem_${input.id}`,
        lineNo: 1,
        method: input.method ?? "cash",
        provider: input.provider ?? null,
        channelLabel: input.channelLabel ?? null,
        amount: input.total,
        cashReceived: input.method === "cash" || !input.method ? input.total : null,
        status: "success" as const,
        createdAt: input.at,
        updatedAt: input.at,
      }];
  db.insert(payments).values(paymentValues).run();
}

function seedCustomerMembers() {
  db.insert(customerMembers)
    .values([
      {
        id: "member_budi",
        fullName: "Budi Santoso",
        phone: "6281234567890",
        email: "budi@example.com",
        termsAcceptedAt: "2026-07-01T00:00:00.000Z",
        privacyAcceptedAt: "2026-07-01T00:00:00.000Z",
        pointsBalance: 66,
        tier: "silver",
      },
      {
        id: "member_ayu",
        fullName: "Ayu Lestari",
        phone: "628111222333",
        email: "ayu@example.com",
        termsAcceptedAt: "2026-07-01T00:00:00.000Z",
        privacyAcceptedAt: "2026-07-01T00:00:00.000Z",
        pointsBalance: 11,
        tier: "silver",
      },
    ])
    .run();
}

function seedCustomerPointEvents() {
  db.insert(customerPointEvents)
    .values([
      {
        id: "point_budi_order_cash",
        memberId: "member_budi",
        kind: "earn",
        points: 111,
        sourceOrderId: "order_cash",
        note: "Belanja TRX-001",
        createdAt: "2026-07-01T09:00:00.000Z",
        updatedAt: "2026-07-01T09:00:00.000Z",
      },
      {
        id: "point_budi_order_qris",
        memberId: "member_budi",
        kind: "earn",
        points: 55,
        sourceOrderId: "order_qris",
        note: "Belanja TRX-002",
        createdAt: "2026-07-02T10:00:00.000Z",
        updatedAt: "2026-07-02T10:00:00.000Z",
      },
      {
        id: "point_budi_redeem",
        memberId: "member_budi",
        kind: "redeem",
        points: -100,
        note: "Tukar Voucher Rp100.000",
        createdAt: "2026-07-02T12:00:00.000Z",
        updatedAt: "2026-07-02T12:00:00.000Z",
      },
      {
        id: "point_ayu_order_old",
        memberId: "member_ayu",
        kind: "earn",
        points: 11,
        sourceOrderId: "order_outside_range",
        note: "Di luar range",
        createdAt: "2026-06-30T23:00:00.000Z",
        updatedAt: "2026-06-30T23:00:00.000Z",
      },
    ])
    .run();
}

function seedReportData() {
  seedBase();
  seedCustomerMembers();
  seedOrder({
    id: "order_cash",
    no: "TRX-001",
    total: 111000,
    subtotal: 100000,
    tax: 11000,
    at: "2026-07-01T09:00:00.000Z",
    method: "cash",
    customerMemberId: "member_budi",
    customerPhone: "6281234567890",
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
    customerMemberId: "member_budi",
    customerPhone: "6281234567890",
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
  seedCustomerPointEvents();
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

  it("separates order channels, promo discounts, and split payment lines without double-counting sales", () => {
    seedOrder({
      id: "order_gofood",
      no: "TRX-GF",
      total: 70000,
      subtotal: 80000,
      discount: 10000,
      promoName: "Promo GoFood",
      orderType: "delivery",
      deliveryProvider: "gofood",
      channelOrderName: "GF-42",
      method: "transfer",
      provider: "bca",
      channelLabel: "Transfer Rekening BCA",
      at: "2026-07-02T10:00:00.000Z",
    });
    seedOrder({
      id: "order_split",
      no: "TRX-SPLIT",
      total: 90000,
      orderType: "dinein",
      splitPayments: [
        { id: "pay_split_cash", method: "cash", amount: 40000, cashReceived: 50000, changeAmount: 10000 },
        { id: "pay_split_card", method: "card", provider: "edc_mandiri", channelLabel: "EDC Mandiri", amount: 50000, referenceNo: "APP-9" },
      ],
      at: "2026-07-02T11:00:00.000Z",
    });

    const report = buildOwnerReport(db, reportInput);
    expect(report.summary.grossSales).toBe(326000);
    expect(report.orderChannels.map((row) => [row.channel, row.count, row.total])).toContainEqual(["Delivery GoFood", 1, 70000]);
    expect(report.promoDiscounts).toContainEqual({ promoName: "Promo GoFood", amount: 10000, orders: 1 });
    expect(report.paymentMethods.map((row) => [row.method, row.total])).toEqual(
      expect.arrayContaining([
        ["Transfer Rekening BCA", 70000],
        ["EDC Mandiri", 50000],
        ["Tunai", 151000],
      ]),
    );
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

  it("includes customer member, activity, repeat, and point totals for owner reporting hooks", () => {
    const report = buildOwnerReport(db, reportInput);

    expect(report.customer).toMatchObject({
      memberCount: 2,
      activeMembers30d: 1,
      repeatMembers: 1,
      pointsIssued: 166,
      pointsRedeemed: 100,
    });
    expect(report.customer.topMembers).toEqual([
      {
        memberId: "member_budi",
        fullName: "Budi Santoso",
        phone: "6281234567890",
        orders: 2,
        spend: 166000,
        pointsBalance: 66,
      },
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
