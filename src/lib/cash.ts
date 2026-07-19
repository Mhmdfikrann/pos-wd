/**
 * Cash + close-shift wrapper bound to the app DB (Phase 8).
 */
import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shifts } from "@/db/schema";
import {
  closeShift as closeShiftCore,
  computeExpectedCash as computeExpectedCashCore,
  recordCashMovement as recordCashMovementCore,
  type CashMovementView,
  type CloseShiftInput,
  type ClosedShiftView,
  type ExpectedCashBreakdown,
  type RecordCashMovementInput,
} from "@/lib/cash-data";

export type {
  CashMovementType,
  CashMovementView,
  CloseShiftInput,
  ClosedShiftView,
  ExpectedCashBreakdown,
  RecordCashMovementInput,
} from "@/lib/cash-data";

export interface CashShiftRef {
  id: string;
  outletId: string;
  cashierId: string;
  status: "open" | "closed";
}

export function getCashShift(shiftId: string): CashShiftRef | null {
  const row = db
    .select({
      id: shifts.id,
      outletId: shifts.outletId,
      cashierId: shifts.cashierId,
      status: shifts.status,
    })
    .from(shifts)
    .where(eq(shifts.id, shiftId))
    .get();
  return row ?? null;
}

export function computeExpectedCash(shiftId: string): ExpectedCashBreakdown {
  return computeExpectedCashCore(db, shiftId);
}

export function recordCashMovement(input: RecordCashMovementInput): CashMovementView {
  return recordCashMovementCore(db, input);
}

export function closeShift(input: CloseShiftInput): ClosedShiftView {
  return closeShiftCore(db, input);
}
