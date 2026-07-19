import { describe, it, expect } from "vitest";
import {
  cleanOpeningCash,
  assertNoActiveShift,
  formatShiftDuration,
  type OpenShiftLike,
} from "./shift-rules";

describe("cleanOpeningCash", () => {
  it("accepts non-negative integers (number or numeric string)", () => {
    expect(cleanOpeningCash(0)).toBe(0);
    expect(cleanOpeningCash(500000)).toBe(500000);
    expect(cleanOpeningCash("250000")).toBe(250000);
  });
  it("rejects negatives (BR-008)", () => {
    expect(() => cleanOpeningCash(-1)).toThrow(/≥ 0/);
    expect(() => cleanOpeningCash("-50000")).toThrow();
  });
  it("rejects fractions and non-numbers (BR-002 — integer rupiah)", () => {
    expect(() => cleanOpeningCash(100.5)).toThrow();
    expect(() => cleanOpeningCash("abc")).toThrow();
    expect(() => cleanOpeningCash(NaN)).toThrow();
    expect(() => cleanOpeningCash(undefined)).toThrow();
  });
});

describe("assertNoActiveShift", () => {
  const open: OpenShiftLike = { outletId: "out_1", cashierId: "u_1", status: "open" };

  it("passes when there is no existing shift", () => {
    expect(() => assertNoActiveShift(null, "out_1", "u_1")).not.toThrow();
    expect(() => assertNoActiveShift(undefined, "out_1", "u_1")).not.toThrow();
  });
  it("throws when an open shift already exists for the same (outlet, cashier)", () => {
    expect(() => assertNoActiveShift(open, "out_1", "u_1")).toThrow(/shift terbuka/);
  });
  it("passes when the existing shift is closed", () => {
    const closed: OpenShiftLike = { ...open, status: "closed" };
    expect(() => assertNoActiveShift(closed, "out_1", "u_1")).not.toThrow();
  });
  it("passes when the open shift belongs to a different outlet or cashier", () => {
    expect(() => assertNoActiveShift(open, "out_2", "u_1")).not.toThrow();
    expect(() => assertNoActiveShift(open, "out_1", "u_2")).not.toThrow();
  });
});

describe("formatShiftDuration", () => {
  const base = 1_000_000_000_000;
  it("formats hours + minutes like the mockup", () => {
    expect(formatShiftDuration(base, base + (4 * 60 + 12) * 60_000)).toBe("4j 12m");
  });
  it("drops the hour segment under 60 minutes", () => {
    expect(formatShiftDuration(base, base + 45 * 60_000)).toBe("45m");
  });
  it("clamps negatives and sub-minute spans to 0m", () => {
    expect(formatShiftDuration(base, base - 10_000)).toBe("0m");
    expect(formatShiftDuration(base, base + 30_000)).toBe("0m");
  });
});
