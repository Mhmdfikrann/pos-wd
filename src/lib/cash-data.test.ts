/**
 * Cash + close-shift integration tests (Phase 8).
 *
 * Runs real Drizzle queries against an in-memory SQLite database built from
 * committed migrations. These pin the reconciliation rules: expected cash math,
 * note-required differences, close immutability, and cash movement ledger.
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
  cashMovements,
} from "@/db/schema";
import {
  closeShift,
  computeExpectedCash,
  recordCashMovement,
  type CashDb,
} from "@/lib/cash-data";

let db: CashDb;

function seed() {
  db.insert(roles).values({ id: "role_kasir", name: "Kasir" }).run();
  db.insert(users)
    .values([
      { id: "u_kasir", name: "Sinta", email: "sinta@t.local", roleId: "role_kasir" },
      { id: "u_manager", name: "Rina", email: "rina@t.local", roleId: "role_kasir" },
    ])
    .run();
  db.insert(outlets).values({ id: "outlet_a", name: "Outlet A", code: "A" }).run();
  db.insert(categories).values({ id: "cat_dimsum", name: "Dimsum", sortOrder: 1 }).run();
  db.insert(products).values({ id: "prod_1", categoryId: "cat_dimsum", name: "Dimsum", sku: "D-1", price: 10000 }).run();
  db.insert(shifts)
    .values({
      id: "shift_a",
      outletId: "outlet_a",
      cashierId: "u_kasir",
      status: "open",
      openingCash: 100000,
    })
    .run();
  db.insert(orders)
    .values([
      {
        id: "order_cash",
        orderNo: "TRX-CASH",
        outletId: "outlet_a",
        shiftId: "shift_a",
        cashierId: "u_kasir",
        orderType: "dinein",
        status: "paid",
        subtotal: 50000,
        taxAmount: 0,
        total: 50000,
      },
      {
        id: "order_qris",
        orderNo: "TRX-QRIS",
        outletId: "outlet_a",
        shiftId: "shift_a",
        cashierId: "u_kasir",
        orderType: "takeaway",
        status: "paid",
        subtotal: 40000,
        taxAmount: 0,
        total: 40000,
      },
    ])
    .run();
  db.insert(payments)
    .values([
      {
        id: "pay_cash",
        orderId: "order_cash",
        idempotencyKey: "cash-key",
        method: "cash",
        amount: 50000,
        cashReceived: 50000,
        status: "success",
      },
      {
        id: "pay_qris",
        orderId: "order_qris",
        idempotencyKey: "qris-key",
        method: "qris",
        amount: 40000,
        status: "success",
      },
    ])
    .run();
  db.insert(refunds)
    .values({
      id: "refund_cash",
      orderId: "order_cash",
      amount: 10000,
      reason: "Retur tunai",
      actorId: "u_kasir",
      approvedById: "u_manager",
    })
    .run();
}

beforeEach(() => {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  db = drizzle(sqlite) as BetterSQLite3Database<Record<string, never>> as CashDb;
  migrate(db as never, { migrationsFolder: "./drizzle" });
  seed();
});

describe("computeExpectedCash", () => {
  it("includes opening cash, cash payments, cash movements, expenses, and refunds", () => {
    recordCashMovement(db, {
      shiftId: "shift_a",
      type: "cash_in",
      amount: 20000,
      actorId: "u_kasir",
      note: "Tambah kas kecil",
    });
    recordCashMovement(db, {
      shiftId: "shift_a",
      type: "cash_out",
      amount: 15000,
      actorId: "u_kasir",
      note: "Setor sementara",
    });
    recordCashMovement(db, {
      shiftId: "shift_a",
      type: "expense",
      amount: 5000,
      actorId: "u_kasir",
      note: "Beli es batu",
    });

    const expected = computeExpectedCash(db, "shift_a");

    expect(expected).toMatchObject({
      openingCash: 100000,
      cashPayments: 50000,
      cashIn: 20000,
      cashOut: 15000,
      expenses: 5000,
      cashRefunds: 10000,
      expectedCash: 140000,
    });
  });
});

describe("recordCashMovement", () => {
  it("writes one cash movement for an open shift", () => {
    const movement = recordCashMovement(db, {
      shiftId: "shift_a",
      type: "adjustment",
      amount: 7000,
      actorId: "u_manager",
      note: "Koreksi kas",
    });

    expect(movement).toMatchObject({
      shiftId: "shift_a",
      type: "adjustment",
      amount: 7000,
      actorId: "u_manager",
      note: "Koreksi kas",
    });
    expect(db.select().from(cashMovements).all()).toHaveLength(1);
  });

  it("rejects movement after shift is closed", () => {
    closeShift(db, { shiftId: "shift_a", actualCash: 140000, note: "Sesuai", actorId: "u_kasir" });

    expect(() =>
      recordCashMovement(db, {
        shiftId: "shift_a",
        type: "cash_in",
        amount: 1000,
        actorId: "u_kasir",
      }),
    ).toThrow(/closed|tertutup|ditutup/i);
  });
});

describe("closeShift", () => {
  it("stores expected, actual, difference, note, and closed timestamp", () => {
    const closed = closeShift(db, {
      shiftId: "shift_a",
      actualCash: 140000,
      note: "Rekonsiliasi sesuai",
      actorId: "u_kasir",
      now: "2026-07-19T16:00:00.000Z",
    });

    expect(closed).toMatchObject({
      id: "shift_a",
      status: "closed",
      expectedCash: 140000,
      actualCash: 140000,
      cashDifference: 0,
      closingNote: "Rekonsiliasi sesuai",
      closedAt: "2026-07-19T16:00:00.000Z",
    });
  });

  it("requires a closing note when there is any cash difference", () => {
    expect(() =>
      closeShift(db, {
        shiftId: "shift_a",
        actualCash: 139000,
        note: "",
        actorId: "u_kasir",
      }),
    ).toThrow(/catatan/i);

    expect(db.select().from(shifts).where(eq(shifts.id, "shift_a")).get()?.status).toBe("open");
  });

  it("rejects closing an already closed shift", () => {
    closeShift(db, { shiftId: "shift_a", actualCash: 140000, note: "Sesuai", actorId: "u_kasir" });

    expect(() =>
      closeShift(db, { shiftId: "shift_a", actualCash: 140000, note: "Coba tutup lagi", actorId: "u_kasir" }),
    ).toThrow(/ditutup/i);
  });
});
