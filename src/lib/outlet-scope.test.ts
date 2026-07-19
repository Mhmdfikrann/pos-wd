/**
 * Cross-outlet authorization tests (BR-010, PRD §20.4 — IDOR).
 *
 * Proves the outlet-scope primitives deny access to outlets outside a session's
 * assigned set. This is the Phase 2 DoD's cross-outlet authorization test; it
 * runs against the pure primitives (no DB/session needed) so the security
 * invariant is pinned independent of any screen wiring.
 */
import { describe, it, expect } from "vitest";
import {
  canAccessOutlet,
  assertOutletAccess,
  scopedOutletIds,
  OutletScopeError,
  type OutletScoped,
} from "./outlet-scope";

// A cashier assigned to outlet A only.
const kasirA: OutletScoped = { outletIds: ["outlet_a"] };
// An owner assigned to both outlets (scope is data-driven, no special-casing).
const owner: OutletScoped = { outletIds: ["outlet_a", "outlet_b"] };
// A freshly-created user with no outlet assignment yet.
const orphan: OutletScoped = { outletIds: [] };

describe("canAccessOutlet", () => {
  it("allows an outlet in scope", () => {
    expect(canAccessOutlet(kasirA, "outlet_a")).toBe(true);
  });

  it("denies an outlet outside scope (IDOR)", () => {
    expect(canAccessOutlet(kasirA, "outlet_b")).toBe(false);
  });

  it("denies everything for a user with no outlets", () => {
    expect(canAccessOutlet(orphan, "outlet_a")).toBe(false);
  });

  it("owner reaches every assigned outlet via data, not a bypass", () => {
    expect(canAccessOutlet(owner, "outlet_a")).toBe(true);
    expect(canAccessOutlet(owner, "outlet_b")).toBe(true);
    // Even owner is denied an outlet not in their userOutlets set.
    expect(canAccessOutlet(owner, "outlet_c")).toBe(false);
  });
});

describe("assertOutletAccess", () => {
  it("passes silently for an in-scope outlet", () => {
    expect(() => assertOutletAccess(kasirA, "outlet_a")).not.toThrow();
  });

  it("throws OutletScopeError for a cross-outlet request", () => {
    expect(() => assertOutletAccess(kasirA, "outlet_b")).toThrow(OutletScopeError);
  });

  it("the thrown error carries the offending outletId", () => {
    try {
      assertOutletAccess(kasirA, "outlet_b");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(OutletScopeError);
      expect((err as OutletScopeError).outletId).toBe("outlet_b");
    }
  });
});

describe("scopedOutletIds", () => {
  it("returns just the requested outlet when it is in scope", () => {
    expect(scopedOutletIds(kasirA, "outlet_a")).toEqual(["outlet_a"]);
  });

  it("throws for a requested outlet outside scope (no silent leak)", () => {
    expect(() => scopedOutletIds(kasirA, "outlet_b")).toThrow(OutletScopeError);
  });

  it("falls back to the full in-scope set when no outlet is requested", () => {
    expect(scopedOutletIds(owner, null)).toEqual(["outlet_a", "outlet_b"]);
    expect(scopedOutletIds(owner, "")).toEqual(["outlet_a", "outlet_b"]);
    expect(scopedOutletIds(owner, undefined)).toEqual(["outlet_a", "outlet_b"]);
  });

  it("a bare list query for an orphan user yields nothing (not all outlets)", () => {
    expect(scopedOutletIds(orphan)).toEqual([]);
  });
});
