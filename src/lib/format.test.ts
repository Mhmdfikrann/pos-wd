/**
 * Smoke tests for the shared formatting helpers (PRD BR-002 — integer rupiah).
 * These are pure functions; no DB or env needed.
 */
import { describe, it, expect } from "vitest";
import { formatRupiah, formatNumber, formatMMSS, formatClock } from "./format";

describe("formatRupiah", () => {
  it("formats integer rupiah with Indonesian grouping", () => {
    expect(formatRupiah(18000)).toBe("Rp 18.000");
    expect(formatRupiah(145000)).toBe("Rp 145.000");
  });

  it("handles zero and small amounts", () => {
    expect(formatRupiah(0)).toBe("Rp 0");
    expect(formatRupiah(500)).toBe("Rp 500");
  });

  it("rounds non-integer input (defensive — money should be integer)", () => {
    expect(formatRupiah(18000.4)).toBe("Rp 18.000");
    expect(formatRupiah(18000.6)).toBe("Rp 18.001");
  });
});

describe("formatNumber", () => {
  it("groups thousands the Indonesian way", () => {
    expect(formatNumber(1284)).toBe("1.284");
    expect(formatNumber(42)).toBe("42");
  });
});

describe("formatMMSS", () => {
  it("formats seconds as m:ss with zero-padded seconds", () => {
    expect(formatMMSS(312)).toBe("5:12");
    expect(formatMMSS(5)).toBe("0:05");
    expect(formatMMSS(600)).toBe("10:00");
  });
});

describe("formatClock", () => {
  it("formats a Date as zero-padded 24h H_m_s (separator is locale-dependent)", () => {
    const d = new Date(2026, 6, 19, 9, 5, 3);
    // id-ID renders "09.05.03"; other ICU builds may use ":". Assert the
    // zero-padded 24h structure rather than a locale-specific separator.
    expect(formatClock(d)).toMatch(/^09\D05\D03$/);
  });

  it("keeps the hour in 24h form past noon", () => {
    const d = new Date(2026, 6, 19, 21, 0, 0);
    expect(formatClock(d)).toMatch(/^21\D00\D00$/);
  });
});
