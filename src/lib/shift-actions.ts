"use server";

/**
 * Shift server actions (Phase 4, PRD §8.7 / §10.1, FR-009, BR-008, §8.10).
 *
 * The AUTHORITATIVE enforcement point for opening a shift:
 *  1. `requirePermission("shift.open")` — Owner/Manager/Kasir hold it (Phase 0).
 *  2. Outlet scope: the target outlet must be in the caller's `userOutlets`
 *     (BR-010) — a client-supplied outletId is untrusted.
 *  3. Validate opening cash + re-check the one-open-shift invariant (in `shift.ts`).
 *  4. Audit the open-shift event (§8.10).
 *  5. `revalidatePath("/kasir")` so the POS re-reads shift state.
 *
 * Returns a discriminated `{ ok: true, ... } | { ok: false, error }` so the
 * client renders a clean Indonesian message instead of catching a throw.
 */
import { revalidatePath } from "next/cache";
import { requirePermission, PermissionError } from "@/lib/session";
import { assertOutletAccess, OutletScopeError } from "@/lib/outlet-scope";
import { writeAudit } from "@/lib/audit";
import { cleanOpeningCash } from "@/lib/shift-rules";
import { openShift, getActiveShift, type Shift } from "@/lib/shift";
import {
  closeShift,
  computeExpectedCash,
  getCashShift,
  recordCashMovement,
  type CashMovementType,
  type CashMovementView,
  type ClosedShiftView,
  type ExpectedCashBreakdown,
} from "@/lib/cash";

const PERM = "shift.open";
const CLOSE_PERM = "shift.close";

export type ActionResult<T = void> = ({ ok: true } & T) | { ok: false; error: string };

export async function actionOpenShift(input: {
  outletId: string;
  openingCash: number;
}): Promise<ActionResult<{ shift: Shift }>> {
  try {
    const session = await requirePermission(PERM);

    // Outlet scope (BR-010) — never trust the client's outletId.
    assertOutletAccess(session, input.outletId);

    // Fail fast on bad cash before hitting the DB (also re-checked in openShift).
    const openingCash = cleanOpeningCash(input.openingCash);

    const shift = await openShift({
      outletId: input.outletId,
      cashierId: session.userId,
      openingCash,
    });

    await writeAudit({
      action: "shift.open",
      actorId: session.userId,
      outletId: input.outletId,
      entity: "shift",
      entityId: shift.id,
      detail: { openingCash },
    });

    revalidatePath("/kasir");
    return { ok: true, shift };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { ok: false, error: "Anda tidak punya izin membuka shift." };
    }
    if (err instanceof OutletScopeError) {
      return { ok: false, error: "Outlet ini di luar akses Anda." };
    }
    const msg = err instanceof Error ? err.message : String(err);
    // The partial unique index (shifts_one_open_unq) trips here on a race.
    if (/UNIQUE|unique/.test(msg)) {
      return { ok: false, error: "Masih ada shift terbuka di outlet ini." };
    }
    // Validation messages from shift-rules are already user-friendly.
    if (/Kas awal|shift terbuka/.test(msg)) {
      return { ok: false, error: msg };
    }
    console.error("[shift-action] openShift failed:", err);
    return { ok: false, error: "Gagal membuka shift. Coba lagi." };
  }
}

/** Read the caller's active shift at an outlet (outlet-scoped). For the POS gate. */
export async function actionGetActiveShift(
  outletId: string,
): Promise<ActionResult<{ shift: Shift | null }>> {
  try {
    const session = await requirePermission(PERM);
    assertOutletAccess(session, outletId);
    const shift = await getActiveShift(outletId, session.userId);
    return { ok: true, shift };
  } catch (err) {
    if (err instanceof PermissionError) return { ok: false, error: "Tidak ada izin." };
    if (err instanceof OutletScopeError) return { ok: false, error: "Outlet di luar akses." };
    console.error("[shift-action] getActiveShift failed:", err);
    return { ok: false, error: "Gagal memuat shift." };
  }
}

export async function actionGetExpectedCash(
  shiftId: string,
): Promise<ActionResult<{ expected: ExpectedCashBreakdown }>> {
  try {
    const session = await requirePermission(CLOSE_PERM);
    const shift = getCashShift(shiftId);
    if (!shift) return { ok: false, error: "Shift tidak ditemukan." };
    assertOutletAccess(session, shift.outletId);
    if (session.roleId === "role_kasir" && shift.cashierId !== session.userId) {
      return { ok: false, error: "Anda hanya dapat menutup shift sendiri." };
    }
    return { ok: true, expected: computeExpectedCash(shiftId) };
  } catch (err) {
    if (err instanceof PermissionError) return { ok: false, error: "Anda tidak punya izin menutup shift." };
    if (err instanceof OutletScopeError) return { ok: false, error: "Outlet ini di luar akses Anda." };
    console.error("[shift-action] getExpectedCash failed:", err);
    return { ok: false, error: "Gagal menghitung kas shift." };
  }
}

export async function actionRecordCashMovement(input: {
  shiftId: string;
  type: CashMovementType;
  amount: number;
  note?: string | null;
}): Promise<ActionResult<{ movement: CashMovementView }>> {
  try {
    const session = await requirePermission(CLOSE_PERM);
    const shift = getCashShift(input.shiftId);
    if (!shift) return { ok: false, error: "Shift tidak ditemukan." };
    assertOutletAccess(session, shift.outletId);
    if (session.roleId === "role_kasir" && shift.cashierId !== session.userId) {
      return { ok: false, error: "Anda hanya dapat mengubah kas shift sendiri." };
    }

    const movement = recordCashMovement({
      shiftId: input.shiftId,
      type: input.type,
      amount: input.amount,
      note: input.note ?? null,
      actorId: session.userId,
    });

    if (input.type === "adjustment") {
      await writeAudit({
        action: "cash.adjustment",
        actorId: session.userId,
        outletId: shift.outletId,
        entity: "cash_movement",
        entityId: movement.id,
        detail: { shiftId: input.shiftId, amount: input.amount, note: movement.note },
      });
    }

    revalidatePath("/kasir");
    revalidatePath("/manager");
    return { ok: true, movement };
  } catch (err) {
    if (err instanceof PermissionError) return { ok: false, error: "Anda tidak punya izin mencatat kas." };
    if (err instanceof OutletScopeError) return { ok: false, error: "Outlet ini di luar akses Anda." };
    const msg = err instanceof Error ? err.message : String(err);
    if (/kas|shift|ditutup|rupiah/i.test(msg)) return { ok: false, error: msg };
    console.error("[shift-action] recordCashMovement failed:", err);
    return { ok: false, error: "Gagal mencatat mutasi kas." };
  }
}

export async function actionCloseShift(input: {
  shiftId: string;
  actualCash: number;
  note?: string | null;
}): Promise<ActionResult<{ shift: ClosedShiftView }>> {
  try {
    const session = await requirePermission(CLOSE_PERM);
    const target = getCashShift(input.shiftId);
    if (!target) return { ok: false, error: "Shift tidak ditemukan." };
    assertOutletAccess(session, target.outletId);
    if (session.roleId === "role_kasir" && target.cashierId !== session.userId) {
      return { ok: false, error: "Anda hanya dapat menutup shift sendiri." };
    }

    const shift = closeShift({
      shiftId: input.shiftId,
      actualCash: input.actualCash,
      note: input.note ?? null,
      actorId: session.userId,
    });

    await writeAudit({
      action: "shift.close",
      actorId: session.userId,
      outletId: target.outletId,
      entity: "shift",
      entityId: input.shiftId,
      detail: {
        expectedCash: shift.expectedCash,
        actualCash: shift.actualCash,
        cashDifference: shift.cashDifference,
        note: shift.closingNote,
      },
    });

    revalidatePath("/kasir");
    revalidatePath("/manager");
    return { ok: true, shift };
  } catch (err) {
    if (err instanceof PermissionError) return { ok: false, error: "Anda tidak punya izin menutup shift." };
    if (err instanceof OutletScopeError) return { ok: false, error: "Outlet ini di luar akses Anda." };
    const msg = err instanceof Error ? err.message : String(err);
    if (/kas|shift|ditutup|rupiah|catatan/i.test(msg)) return { ok: false, error: msg };
    console.error("[shift-action] closeShift failed:", err);
    return { ok: false, error: "Gagal menutup shift." };
  }
}
