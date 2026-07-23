import { describe, it, expect } from "vitest";
import { products, addons, productAddons } from "@/db/schema";
import { getProductAddons, saveProductAddons } from "@/lib/catalog";

describe("Phase U03-00: Schema & Migrations for Revisi 03", () => {
  it("schema definition contains new columns and table", () => {
    expect(products.minOrder).toBeDefined();
    expect(products.isFavorite).toBeDefined();
    expect(products.showInBar).toBeDefined();
    expect(products.onlinePrices).toBeDefined();

    expect(addons.isMandatory).toBeDefined();
    expect(addons.selectMode).toBeDefined();

    expect(productAddons).toBeDefined();
  });

  it("exports productAddons data helpers", () => {
    expect(typeof getProductAddons).toBe("function");
    expect(typeof saveProductAddons).toBe("function");
  });
});
