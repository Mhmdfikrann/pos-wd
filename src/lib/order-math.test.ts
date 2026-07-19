import { describe, it, expect } from "vitest";
import { computeTotals, computeChange, type OrderLine } from "./order-math";

function line(unitPrice: number, quantity: number, extra: Partial<OrderLine> = {}): OrderLine {
  return {
    productId: "p",
    nameSnapshot: "Item",
    skuSnapshot: null,
    variantSnapshot: null,
    unitPrice,
    costSnapshot: 0,
    quantity,
    note: null,
    ...extra,
  };
}

describe("computeTotals", () => {
  it("sums subtotal and applies tax on the full subtotal when no discount", () => {
    // 18000*2 + 24000*1 = 60000; PPN 11% = 6600; total 66600
    const t = computeTotals([line(18000, 2), line(24000, 1)], 11);
    expect(t.subtotal).toBe(60000);
    expect(t.discountAmount).toBe(0);
    expect(t.taxAmount).toBe(6600);
    expect(t.total).toBe(66600);
  });

  it("always satisfies total = subtotal - discount + tax", () => {
    const t = computeTotals([line(7000, 3), line(12000, 2)], 11, 5000);
    expect(t.total).toBe(t.subtotal - t.discountAmount + t.taxAmount);
  });

  it("computes tax on the discounted base, rounded once", () => {
    // subtotal 50000, discount 10000 -> taxable 40000, 11% = 4400, total 44400
    const t = computeTotals([line(50000, 1)], 11, 10000);
    expect(t.taxAmount).toBe(4400);
    expect(t.total).toBe(44400);
  });

  it("rounds tax to an integer rupiah (no floats leak)", () => {
    // 7000 * 11% = 770 exactly; 5000 * 11% = 550; pick a value that would be fractional
    // 3000 * 11% = 330; 4500 not possible (prices are integers) — use 9090:
    const t = computeTotals([line(9090, 1)], 11);
    // 9090 * 0.11 = 999.9 -> rounds to 1000
    expect(t.taxAmount).toBe(1000);
    expect(Number.isInteger(t.taxAmount)).toBe(true);
  });

  it("clamps discount to the subtotal (never negative taxable/total)", () => {
    const t = computeTotals([line(10000, 1)], 11, 999999);
    expect(t.discountAmount).toBe(10000);
    expect(t.taxAmount).toBe(0);
    expect(t.total).toBe(0);
  });

  it("supports a zero tax outlet", () => {
    const t = computeTotals([line(10000, 2)], 0);
    expect(t.taxAmount).toBe(0);
    expect(t.total).toBe(20000);
  });

  it("empty cart totals to zero", () => {
    expect(computeTotals([], 11)).toEqual({
      subtotal: 0,
      discountAmount: 0,
      taxAmount: 0,
      total: 0,
    });
  });

  it("rejects non-integer prices", () => {
    expect(() => computeTotals([line(1000.5, 1)], 11)).toThrow(/rupiah bulat/);
  });

  it("rejects negative prices", () => {
    expect(() => computeTotals([line(-1000, 1)], 11)).toThrow(/rupiah bulat/);
  });

  it("rejects zero or negative quantities", () => {
    expect(() => computeTotals([line(1000, 0)], 11)).toThrow(/Kuantitas/);
    expect(() => computeTotals([line(1000, -2)], 11)).toThrow(/Kuantitas/);
  });

  it("rejects a negative tax percent", () => {
    expect(() => computeTotals([line(1000, 1)], -5)).toThrow(/pajak/);
  });
});

describe("computeChange", () => {
  it("returns change for an overpayment", () => {
    expect(computeChange(66600, 70000)).toBe(3400);
  });

  it("returns zero when cash equals total", () => {
    expect(computeChange(66600, 66600)).toBe(0);
  });

  it("throws when cash is less than total", () => {
    expect(() => computeChange(66600, 60000)).toThrow(/kurang/);
  });

  it("rejects non-integer money", () => {
    expect(() => computeChange(100.5, 200)).toThrow(/rupiah bulat/);
  });
});
