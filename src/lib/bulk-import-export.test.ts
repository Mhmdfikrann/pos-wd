import { describe, it, expect } from "vitest";
import { arrayToCsv, csvToArray } from "@/lib/csv";

describe("Phase U02-01: Bulk Import & Export", () => {
  it("generates correct CSV format from headers and rows", () => {
    const headers = ["SKU", "Nama Produk", "Harga Jual"];
    const data = [
      ["WD-01", "Dimsum Ayam", 18000],
      ["WD-02", "Siomay Goreng", 20000],
    ];
    const csv = arrayToCsv(headers, data);
    expect(csv).toContain("SKU,Nama Produk,Harga Jual");
    expect(csv).toContain("WD-01,Dimsum Ayam,18000");
    expect(csv).toContain("WD-02,Siomay Goreng,20000");
  });

  it("parses CSV string into valid data structure", () => {
    const rawCsv = `SKU,Nama Produk,Kategori,Harga Jual,Harga Modal (HPP)\nWD-IMP-01,"Dimsum, Udang",Dimsum,25000,10000`;
    const parsed = csvToArray(rawCsv);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual(["SKU", "Nama Produk", "Kategori", "Harga Jual", "Harga Modal (HPP)"]);
    expect(parsed[1]).toEqual(["WD-IMP-01", "Dimsum, Udang", "Dimsum", "25000", "10000"]);
  });
});
