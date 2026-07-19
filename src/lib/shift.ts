/**
 * Shift data-access layer (Phase 4, PRD §8.7 / §10.1, FR-009, BR-008).
 *
 * Pure DB reads/writes for the shift lifecycle's opening half (close +
 * reconciliation land in Phase 8). Like `catalog.ts`, this layer does NOT
 * authorize — the server-action layer (`shift-actions.ts`) gates on
 * `shift.open`, checks outlet scope, and writes the audit log before calling
 * in here. Keeping data access auth-free keeps it reusable (POS read path,
 * tests) and the enforcement point in one obvious place.
 *
 * Money is integer rupiah (BR-002). The one-open-shift invariant (BR-008) is
 * enforced at three layers — see `shift-rules.ts`; here we do the service-level
 * check (`getActiveShift`) and rely on the partial unique index as the backstop.
 *
 * Server-only — never import from a client component.
 */
import "server-only";
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { shifts } from "@/db/schema";
import { assertNoActiveShift, cleanOpeningCash } from "@/lib/shift-rules";

export interface Shift {
  id: string;
  outletId: string;
  cashierId: string;
  status: "open" | "closed";
  openingCash: number;
  openedAt: string;
  closedAt: string | null;
}

/**
 * The open shift for a given (outlet, cashier), or null. This is the helper the
 * POS reads to decide whether to gate the product grid (Phase 5 checkout also
 * calls it, BR-008). By keying on cashier too we return *this* cashier's shift,
 * not merely any open shift at the outlet.
 */
export async function getActiveShift(
  outletId: string,
  cashierId: string,
): Promise<Shift | null> {
  const row = await db
    .select()
    .from(shifts)
    .where(
      and(
        eq(shifts.outletId, outletId),
        eq(shifts.cashierId, cashierId),
        eq(shifts.status, "open"),
      ),
    )
    .get();
  return row ? toShift(row) : null;
}

/**
 * Open a shift. Validates opening cash (BR-008) and re-checks the one-open-shift
 * invariant against the DB before inserting; the partial unique index is the
 * final backstop if two requests race. Returns the created shift.
 *
 * Authorization + audit are the caller's responsibility (`shift-actions.ts`).
 */
export async function openShift(input: {
  outletId: string;
  cashierId: string;
  openingCash: number;
}): Promise<Shift> {
  const openingCash = cleanOpeningCash(input.openingCash);

  const existing = await getActiveShift(input.outletId, input.cashierId);
  assertNoActiveShift(existing, input.outletId, input.cashierId);

  const id = randomUUID();
  await db.insert(shifts).values({
    id,
    outletId: input.outletId,
    cashierId: input.cashierId,
    status: "open",
    openingCash,
  });

  const created = await db.select().from(shifts).where(eq(shifts.id, id)).get();
  if (!created) throw new Error("Gagal membuat shift.");
  return toShift(created);
}

/**
 * The cashier's open shift among a set of outlets (their `userOutlets` scope),
 * or null. Used by the POS gate to decide whether to show the catalog or the
 * open-shift screen. Returns the most recently opened if more than one exists
 * (shouldn't happen given the invariant, but we stay deterministic).
 */
export async function getActiveShiftForCashier(
  cashierId: string,
  outletIds: string[],
): Promise<Shift | null> {
  if (outletIds.length === 0) return null;
  const row = await db
    .select()
    .from(shifts)
    .where(
      and(
        eq(shifts.cashierId, cashierId),
        eq(shifts.status, "open"),
        inArray(shifts.outletId, outletIds),
      ),
    )
    .orderBy(desc(shifts.openedAt))
    .get();
  return row ? toShift(row) : null;
}

type ShiftRow = typeof shifts.$inferSelect;

function toShift(r: ShiftRow): Shift {
  return {
    id: r.id,
    outletId: r.outletId,
    cashierId: r.cashierId,
    status: r.status,
    openingCash: r.openingCash,
    openedAt: r.openedAt,
    closedAt: r.closedAt,
  };
}
