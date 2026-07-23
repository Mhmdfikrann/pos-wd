import { describe, it, expect } from "vitest";
import { arrayToCsv, csvToArray } from "@/lib/csv";

describe("CSV Helper", () => {
  it("converts headers and rows to CSV string with escaping", () => {
    const headers = ["SKU", "Nama Produk", "Harga Jual"];
    const rows = [
      ["WD-01", "Dimsum, Ayam", 18000],
      ["WD-02", 'Dimsum "Spesial"', 22000],
    ];
    const csv = arrayToCsv(headers, rows);
    expect(csv).toContain('WD-01,"Dimsum, Ayam",18000');
    expect(csv).toContain('WD-02,"Dimsum ""Spesial""",22000');
  });

  it("parses CSV string into 2D array correctly", () => {
    const csvContent = `SKU,Nama Produk,Harga Jual\nWD-01,"Dimsum, Ayam",18000\nWD-02,"Dimsum ""Spesial""",22000`;
    const parsed = csvToArray(csvContent);
    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toEqual(["SKU", "Nama Produk", "Harga Jual"]);
    expect(parsed[1]).toEqual(["WD-01", "Dimsum, Ayam", "18000"]);
    expect(parsed[2]).toEqual(["WD-02", 'Dimsum "Spesial"', "22000"]);
  });
});
