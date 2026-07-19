/**
 * Pure shift-lifecycle rules (Phase 4, PRD §10.1, FR-009, BR-008).
 *
 * DB-free so they can be unit-tested and reused: the service layer (`shift.ts`)
 * and the server action (`shift-actions.ts`) call these before touching the DB.
 * They throw a clear Indonesian message on bad input, which the action wrapper
 * turns into a `{ ok: false, error }` result.
 *
 * The "one active shift" invariant has three layers of defense:
 *   1. these rules (fail fast, friendly message),
 *   2. the service check in `shift.ts` (queries for an existing open shift),
 *   3. the partial unique index `shifts_one_open_unq` (the hard DB guard).
 */

/** A row shape sufficient to reason about the open-shift invariant. */
export interface OpenShiftLike {
  outletId: string;
  cashierId: string;
  status: "open" | "closed";
}

/**
 * Validate + normalize an opening-cash amount (BR-008: non-negative integer
 * rupiah — no floats, BR-002). Accepts a number or numeric string from a form.
 */
export function cleanOpeningCash(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    throw new Error("Kas awal harus bilangan rupiah bulat ≥ 0.");
  }
  return n;
}

/**
 * Guard the one-active-shift invariant (BR-008). Throws if `existing` already
 * holds an open shift for the same (outlet, cashier). `existing` is whatever the
 * service found — null/undefined when none.
 */
export function assertNoActiveShift(
  existing: OpenShiftLike | null | undefined,
  outletId: string,
  cashierId: string,
): void {
  if (
    existing &&
    existing.status === "open" &&
    existing.outletId === outletId &&
    existing.cashierId === cashierId
  ) {
    throw new Error("Masih ada shift terbuka di outlet ini. Tutup dulu sebelum buka lagi.");
  }
}

/**
 * Elapsed-time label for the live shift badge, e.g. "4j 12m" (mockup format).
 * Negative or sub-minute spans clamp to "0m". Pure so the formatting is tested
 * without a clock.
 */
export function formatShiftDuration(openedAtMs: number, nowMs: number): string {
  const mins = Math.max(0, Math.floor((nowMs - openedAtMs) / 60_000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}j ${m}m` : `${m}m`;
}
