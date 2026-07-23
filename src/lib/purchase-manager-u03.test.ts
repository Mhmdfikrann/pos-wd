import { describe, it, expect } from "vitest";
import { PURCHASE_LABELS } from "@/components/owner/PurchaseManager";

describe("PurchaseManager: Nav & Submenus for Pembelian Stok", () => {
  it("includes all requested submenus under Pembelian Stok", () => {
    expect(PURCHASE_LABELS).toContain("Permintaan Barang");
    expect(PURCHASE_LABELS).toContain("Pemesanan Stock");
    expect(PURCHASE_LABELS).toContain("Faktur Pembelian");
    expect(PURCHASE_LABELS).toContain("Pembayaran Faktur");
  });
});
