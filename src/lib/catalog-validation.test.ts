import { describe, it, expect } from "vitest";
import { cleanName, cleanRupiah, cleanSku } from "./catalog-validation";

describe("cleanName", () => {
  it("trims and returns a valid name", () => {
    expect(cleanName("  Dimsum Ayam  ")).toBe("Dimsum Ayam");
  });
  it("rejects empty / whitespace-only", () => {
    expect(() => cleanName("   ")).toThrow(/wajib diisi/);
    expect(() => cleanName("")).toThrow(/wajib diisi/);
    expect(() => cleanName(undefined)).toThrow(/wajib diisi/);
  });
  it("rejects overly long names", () => {
    expect(() => cleanName("x".repeat(121))).toThrow(/terlalu panjang/);
  });
});

describe("cleanRupiah", () => {
  it("accepts non-negative integers", () => {
    expect(cleanRupiah(0, "Harga")).toBe(0);
    expect(cleanRupiah(18000, "Harga")).toBe(18000);
    expect(cleanRupiah("22000", "Harga")).toBe(22000);
  });
  it("rejects negatives, fractions, and non-numbers", () => {
    expect(() => cleanRupiah(-1, "Harga")).toThrow();
    expect(() => cleanRupiah(1000.5, "Harga")).toThrow();
    expect(() => cleanRupiah("abc", "Harga")).toThrow();
    expect(() => cleanRupiah(NaN, "Harga")).toThrow();
  });
  it("names the offending field in the message", () => {
    expect(() => cleanRupiah(-5, "Harga modal")).toThrow(/Harga modal/);
  });
});

describe("cleanSku", () => {
  it("uppercases and trims", () => {
    expect(cleanSku("  wd-dim-01 ")).toBe("WD-DIM-01");
  });
  it("rejects empty and illegal characters", () => {
    expect(() => cleanSku("")).toThrow(/wajib diisi/);
    expect(() => cleanSku("wd dim 01")).toThrow(/huruf/);
    expect(() => cleanSku("a")).toThrow(); // too short (min 2)
    expect(() => cleanSku("x".repeat(33))).toThrow(); // too long (max 32)
  });
});
