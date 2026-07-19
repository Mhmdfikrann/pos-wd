/**
 * Outlet-scope enforcement primitives (BR-010, §20.4) — PURE, no server-only
 * imports, so they're unit-testable and reusable from any layer.
 *
 * The rule: a request may only touch outlets the acting user is assigned to.
 * A client-supplied `outletId` is untrusted input and must be checked against
 * the session's scope on the SERVER — never trusted. Owner is deliberately NOT
 * special-cased: the seed grants Owner every outlet via `userOutlets`, so scope
 * stays data-driven with no implicit bypass to audit.
 *
 * `session.ts` re-exports these alongside its server-only session loaders; the
 * split exists only so these functions can be tested without pulling in
 * `next/headers` / `server-only`.
 */

/** Minimal shape the scope check needs — an AppSession satisfies it. */
export interface OutletScoped {
  outletIds: string[];
}

/** Thrown when a request targets an outlet outside the session's scope. */
export class OutletScopeError extends Error {
  constructor(public readonly outletId: string) {
    super(`Akses outlet ditolak: ${outletId}`);
    this.name = "OutletScopeError";
  }
}

/** True if `session` may access `outletId`. */
export function canAccessOutlet(session: OutletScoped, outletId: string): boolean {
  return session.outletIds.includes(outletId);
}

/**
 * Assert the session may access `outletId`, else throw OutletScopeError.
 * Use at the top of any server action/query that takes a client outletId.
 */
export function assertOutletAccess(session: OutletScoped, outletId: string): void {
  if (!canAccessOutlet(session, outletId)) {
    throw new OutletScopeError(outletId);
  }
}

/**
 * Resolve the effective outlet filter for a query. Given an optional requested
 * outletId: if provided, assert access and return just that one; if omitted,
 * return the full in-scope set (so a bare list query can't leak other outlets).
 * Returns a possibly-empty array (a user with no outlets sees nothing) or throws
 * OutletScopeError if a specific out-of-scope outlet was requested.
 */
export function scopedOutletIds(session: OutletScoped, requested?: string | null): string[] {
  if (requested != null && requested !== "") {
    assertOutletAccess(session, requested);
    return [requested];
  }
  return session.outletIds;
}
