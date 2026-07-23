import { describe, it, expect } from "vitest";
import {
  createAddon,
  updateAddon,
  listAddons,
  createProduct,
  getProductAddons,
  saveProductAddons,
} from "@/lib/catalog";

describe("Phase U03-01: Produk Ekstra (Add-on Enhancements)", () => {
  it("creates and updates addon with isMandatory and selectMode", async () => {
    const addonId = await createAddon({
      name: "Saus Keju Extra",
      price: 5000,
      isMandatory: true,
      selectMode: "single",
    });

    let allAddons = await listAddons(true);
    let target = allAddons.find((a) => a.id === addonId);
    expect(target).toBeDefined();
    expect(target?.name).toBe("Saus Keju Extra");
    expect(target?.price).toBe(5000);
    expect(target?.isMandatory).toBe(true);
    expect(target?.selectMode).toBe("single");

    await updateAddon(addonId, {
      isMandatory: false,
      selectMode: "multiple",
    });

    allAddons = await listAddons(true);
    target = allAddons.find((a) => a.id === addonId);
    expect(target?.isMandatory).toBe(false);
    expect(target?.selectMode).toBe("multiple");
  });

  it("links and retrieves product addons", async () => {
    const prodId = await createProduct({
      categoryId: "cat_dimsum",
      name: "Hakau Udang Test",
      sku: `TEST-HAKAU-ADDON-${Date.now()}`,
      price: 22000,
    });

    const add1 = await createAddon({ name: "Sambal Extra", price: 2000 });
    const add2 = await createAddon({ name: "Mayones Extra", price: 3000 });

    await saveProductAddons(prodId, [add1, add2]);

    const linkedAddonIds = await getProductAddons(prodId);
    expect(linkedAddonIds).toContain(add1);
    expect(linkedAddonIds).toContain(add2);
  });
});
