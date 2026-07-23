import { describe, it, expect } from "vitest";
import {
  createProduct,
  getProduct,
  updateProduct,
} from "@/lib/catalog";
import {
  actionUpdateOnlinePrices,
  actionBatchUpdateOnlinePrices,
} from "@/lib/catalog-actions";

describe("Phase U03-04: Online Delivery Pricing (Harga Ojek Online)", () => {
  it("saves and updates online delivery prices per platform for a product", async () => {
    const prodId = await createProduct({
      categoryId: "cat_dimsum",
      name: "Siomay Goreng Special",
      sku: `OJOL-PROD-${Date.now()}`,
      price: 20000,
    });

    const onlinePricesInput = {
      gofood: 24000,
      grabfood: 24500,
      shopeefood: 23000,
    };

    await updateProduct(prodId, { onlinePrices: onlinePricesInput });

    const prod = await getProduct(prodId);
    expect(prod).toBeDefined();
    expect(prod?.onlinePrices).toEqual(onlinePricesInput);
  });

  it("batch updates online delivery prices per product", async () => {
    const p1 = await createProduct({
      categoryId: "cat_dimsum",
      name: "Hakau Special",
      sku: `OJOL-HAKAU-${Date.now()}`,
      price: 25000,
    });

    const p2 = await createProduct({
      categoryId: "cat_minuman",
      name: "Es Teh Manis",
      sku: `OJOL-ESTEH-${Date.now()}`,
      price: 6000,
    });

    const updates = [
      { id: p1, onlinePrices: { gofood: 30000, grabfood: 30000, shopeefood: 28000 } },
      { id: p2, onlinePrices: { gofood: 8000, grabfood: 8000, shopeefood: 7500 } },
    ];

    for (const u of updates) {
      await updateProduct(u.id, { onlinePrices: u.onlinePrices });
    }

    const prod1 = await getProduct(p1);
    const prod2 = await getProduct(p2);

    expect(prod1?.onlinePrices).toEqual({ gofood: 30000, grabfood: 30000, shopeefood: 28000 });
    expect(prod2?.onlinePrices).toEqual({ gofood: 8000, grabfood: 8000, shopeefood: 7500 });
  });
});
