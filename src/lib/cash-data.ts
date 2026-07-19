/**
 * Cash movement + close-shift data access (Phase 8).
 *
 * DB-parameterized so integration tests can run against in-memory SQLite with
 * committed migrations. Server actions bind this to the singleton app DB.
 */
import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
  cashMovements,
  orders,
  payments,
  refunds,
  shifts,
} from "@/db/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CashDb = BetterSQLite3Database<any>;

export type CashMovementType = "cash_in" | "cash_out" | "expense" | "adjustment";

export interface ExpectedCashBreakdown {
  shiftId: string;
  openingCash: number;
  cashPayments: number;
  cashIn: number;
  cashOut: number;
  expenses: number;
  adjustments: number;
  cashRefunds: number;
  expectedCash: number;
}

export interface CashMovementView {
  id: string;
  shiftId: string;
  type: CashMovementType;
  amount: number;
  note: string | null;
  actorId: string | null;
  createdAt: string;
}

export interface ClosedShiftView {
  id: string;
  outletId: string;
  cashierId: string;
  status: "closed";
  openingCash: number;
  expectedCash: number;
  actualCash: number;
  cashDifference: number;
  closingNote: string | null;
  openedAt: string;
  closedAt: string;
}

export interface RecordCashMovementInput {
  shiftId: string;
  type: CashMovementType;
  amount: number;
  actorId: string;
  note?: string | null;
}

export interface CloseShiftInput {
  shiftId: string;
  actualCash: number;
  note?: string | null;
  actorId: string;
  now?: string;
}

export function computeExpectedCash(db: CashDb, shiftId: string): ExpectedCashBreakdown {
  const shift = getShift(db, shiftId);

  const shiftOrders = db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.shiftId, shiftId))
    .all();
  const orderIds = shiftOrders.map((order) => order.id);

  const paymentRows =
    orderIds.length === 0
      ? []
      : db
          .select({
            method: payments.method,
            amount: payments.amount,
            status: payments.status,
          })
          .from(payments)
          .where(inArray(payments.orderId, orderIds))
          .all();
  const cashPayments = paymentRows
    .filter((payment) => payment.method === "cash" && payment.status === "success")
    .reduce((sum, payment) => sum + payment.amount, 0);

  const refundRows =
    orderIds.length === 0
      ? []
      : db
          .select({ amount: refunds.amount })
          .from(refunds)
          .where(and(inArray(refunds.orderId, orderIds), isNotNull(refunds.approvedById)))
          .all();
  const cashRefunds = refundRows.reduce((sum, refund) => sum + refund.amount, 0);

  const movementRows = db
    .select({
      type: cashMovements.type,
      amount: cashMovements.amount,
    })
    .from(cashMovements)
    .where(eq(cashMovements.shiftId, shiftId))
    .all();
  const cashIn = sumMovements(movementRows, "cash_in");
  const cashOut = sumMovements(movementRows, "cash_out");
  const expenses = sumMovements(movementRows, "expense");
  const adjustments = sumMovements(movementRows, "adjustment");
  const expectedCash = shift.openingCash + cashPayments + cashIn + adjustments - cashOut - expenses - cashRefunds;

  return {
    shiftId,
    openingCash: shift.openingCash,
    cashPayments,
    cashIn,
    cashOut,
    expenses,
    adjustments,
    cashRefunds,
    expectedCash,
  };
}

export function recordCashMovement(db: CashDb, input: RecordCashMovementInput): CashMovementView {
  const shift = getShift(db, input.shiftId);
  assertOpenShift(shift.status);
  const amount = cleanCashAmount(input.amount, "Nominal kas");

  const id = randomUUID();
  db.insert(cashMovements)
    .values({
      id,
      shiftId: input.shiftId,
      type: input.type,
      amount,
      note: normalizeNote(input.note),
      actorId: input.actorId,
    })
    .run();

  const row = db.select().from(cashMovements).where(eq(cashMovements.id, id)).get();
  if (!row) throw new Error("Gagal mencatat mutasi kas.");
  return {
    id: row.id,
    shiftId: row.shiftId,
    type: row.type,
    amount: row.amount,
    note: row.note,
    actorId: row.actorId,
    createdAt: row.createdAt,
  };
}

export function closeShift(db: CashDb, input: CloseShiftInput): ClosedShiftView {
  return db.transaction((tx) => {
    const shift = getShift(tx, input.shiftId);
    assertOpenShift(shift.status);

    const actualCash = cleanCashAmount(input.actualCash, "Kas aktual");
    const expected = computeExpectedCash(tx, input.shiftId);
    const cashDifference = actualCash - expected.expectedCash;
    const note = normalizeNote(input.note);

    if (cashDifference !== 0 && !note) {
      throw new Error("Catatan penutupan wajib diisi bila ada selisih kas.");
    }

    const closedAt = input.now ?? new Date().toISOString();
    tx.update(shifts)
      .set({
        status: "closed",
        expectedCash: expected.expectedCash,
        actualCash,
        cashDifference,
        closingNote: note,
        closedAt,
      })
      .where(eq(shifts.id, input.shiftId))
      .run();

    const closed = tx.select().from(shifts).where(eq(shifts.id, input.shiftId)).get();
    if (!closed || closed.status !== "closed" || !closed.closedAt) {
      throw new Error("Gagal menutup shift.");
    }
    return {
      id: closed.id,
      outletId: closed.outletId,
      cashierId: closed.cashierId,
      status: "closed",
      openingCash: closed.openingCash,
      expectedCash: closed.expectedCash ?? 0,
      actualCash: closed.actualCash ?? 0,
      cashDifference: closed.cashDifference ?? 0,
      closingNote: closed.closingNote,
      openedAt: closed.openedAt,
      closedAt: closed.closedAt,
    };
  });
}

function getShift(db: CashDb, shiftId: string): typeof shifts.$inferSelect {
  const shift = db.select().from(shifts).where(eq(shifts.id, shiftId)).get();
  if (!shift) throw new Error("Shift tidak ditemukan.");
  return shift;
}

function assertOpenShift(status: "open" | "closed"): void {
  if (status !== "open") {
    throw new Error("Shift sudah ditutup dan tidak dapat diedit.");
  }
}

function cleanCashAmount(value: unknown, label: string): number {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 0) {
    throw new Error(`${label} harus bilangan rupiah bulat ≥ 0.`);
  }
  return amount;
}

function normalizeNote(note: string | null | undefined): string | null {
  const trimmed = note?.trim() ?? "";
  return trimmed.length === 0 ? null : trimmed;
}

function sumMovements(
  rows: { type: CashMovementType; amount: number }[],
  type: CashMovementType,
): number {
  return rows.filter((row) => row.type === type).reduce((sum, row) => sum + row.amount, 0);
}
