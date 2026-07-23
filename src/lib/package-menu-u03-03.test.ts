import { describe, it, expect } from "vitest";
import {
  createProduct,
  updateProduct,
  getProduct,
  savePackageItems,
  getPackageItems,
  setProductAvailability,
} from "@/lib/catalog";

describe("Phase U03-03: Form, Status, Detail & Ekspor Produk Paket", () => {
  it("creates package product with minOrder, isFavorite, showInBar and package items", async () => {
    const itemProd1 = await createProduct({
      categoryId: "cat_dimsum",
      name: "Siomay Ayam Single",
      sku: `SKU-ITEM1-${Date.now()}`,
      price: 15000,
    });

    const itemProd2 = await createProduct({
      categoryId: "cat_minuman",
      name: "Es Teh Manis Single",
      sku: `SKU-ITEM2-${Date.now()}`,
      price: 5000,
    });

    const pkgSku = `PKT-${Math.floor(1000 + Math.random() * 9000)}`;
    const pkgId = await createProduct({
      categoryId: "cat_dimsum",
      name: "Paket Hemat Mabar",
      sku: pkgSku,
      price: 18000,
      type: "package",
      minOrder: 2,
      isFavorite: true,
      showInBar: true,
    });

    await savePackageItems(pkgId, [
      { itemProductId: itemProd1, quantity: 2 },
      { itemProductId: itemProd2, quantity: 2 },
    ]);

    const createdPkg = await getProduct(pkgId);
    expect(createdPkg).toBeDefined();
    expect(createdPkg?.type).toBe("package");
    expect(createdPkg?.minOrder).toBe(2);
    expect(createdPkg?.isFavorite).toBe(true);
    expect(createdPkg?.showInBar).toBe(true);

    const components = await getPackageItems(pkgId);
    expect(components.length).toBe(2);
    expect(components.find((c) => c.itemProductId === itemProd1)?.quantity).toBe(2);
  });

  it("toggles product availability for package products", async () => {
    const pkgId = await createProduct({
      categoryId: "cat_dimsum",
      name: "Paket Dimsum Super",
      sku: `PKT-TEST-${Date.now()}`,
      price: 35000,
      type: "package",
      available: true,
    });

    await setProductAvailability(pkgId, false);
    let pkg = await getProduct(pkgId);
    expect(pkg?.available).toBe(false);

    await setProductAvailability(pkgId, true);
    pkg = await getProduct(pkgId);
    expect(pkg?.available).toBe(true);
  });
});
