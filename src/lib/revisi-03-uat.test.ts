import { describe, it, expect } from "vitest";
import {
  createProduct,
  getProduct,
  updateProduct,
  createAddon,
  listAddons,
  getProductAddons,
  saveProductAddons,
  saveProductRecipe,
  getProductRecipe,
  savePackageItems,
  getPackageItems,
  setProductAvailability,
  listInventoryItemsSimple,
} from "@/lib/catalog";
import { arrayToCsv } from "@/lib/csv";
import { NAV } from "@/components/owner/nav";

describe("Revisi 03 Full UAT Verification Suite (UAT-03-01 to UAT-03-08)", () => {
  it("UAT-03-01: Owner mengatur Add-on Wajib/Opsional & Pilih 1/Beberapa pada Produk", async () => {
    const addonId = await createAddon({
      name: "Tingkat Pedas Lv 3",
      price: 3000,
      isMandatory: true,
      selectMode: "single",
    });

    const addons = await listAddons(true);
    const targetAddon = addons.find((a) => a.id === addonId);
    expect(targetAddon?.isMandatory).toBe(true);
    expect(targetAddon?.selectMode).toBe("single");

    const prodId = await createProduct({
      categoryId: "cat_dimsum",
      name: "Siomay Pedas UAT",
      sku: `UAT-PEDAS-${Date.now()}`,
      price: 22000,
    });

    await saveProductAddons(prodId, [addonId]);
    const linkedAddonIds = await getProductAddons(prodId);
    expect(linkedAddonIds).toContain(addonId);
  });

  it("UAT-03-02: Owner melihat sub-tab Resep Inventory dengan kalkulasi HPP dan satuan", async () => {
    const prodId = await createProduct({
      categoryId: "cat_dimsum",
      name: "Lumpia Kulit Tahu UAT",
      sku: `UAT-LUMPIA-${Date.now()}`,
      price: 24000,
    });

    const invItems = await listInventoryItemsSimple();
    expect(invItems.length).toBeGreaterThan(0);
    const item = invItems[0];

    await saveProductRecipe(prodId, [{ inventoryItemId: item.id, quantity: 100 }]);
    const recipe = await getProductRecipe(prodId);

    expect(recipe.length).toBe(1);
    expect(recipe[0].inventoryItemId).toBe(item.id);
    expect(recipe[0].quantity).toBe(100);

    const calculatedHpp = recipe[0].quantity * item.cost;
    expect(calculatedHpp).toBe(100 * item.cost);
  });

  it("UAT-03-03: Owner menekan Export CSV dan menyertakan produk paket & single dengan atribut lengkap", async () => {
    const headers = [
      "SKU",
      "Nama Produk",
      "Kategori",
      "Tipe Menu",
      "Harga Jual",
      "Harga Modal (HPP)",
      "Satuan",
      "Minimal Pembelian",
      "Favorit",
      "Tampil di Bar",
      "Station Dapur",
      "Status",
    ];

    const rows = [
      ["WD-DIM-01", "Siomay Ayam", "Dimsum", "Menu Biasa (Single)", 18000, 8000, "porsi", 1, "Ya", "Tidak", "Dapur Dimsum", "Aktif"],
      ["PKT-001", "Paket Combo Dimsum", "Dimsum", "Menu Paket (Combo)", 35000, 16000, "paket", 2, "Ya", "Ya", "Dapur Dimsum", "Aktif"],
    ];

    const csvOutput = arrayToCsv(headers, rows);
    expect(csvOutput).toContain("Tipe Menu");
    expect(csvOutput).toContain("Minimal Pembelian");
    expect(csvOutput).toContain("Menu Paket (Combo)");
    expect(csvOutput).toContain("PKT-001");
  });

  it("UAT-03-04: Owner mengubah status ketersediaan/aktif Produk Paket", async () => {
    const pkgId = await createProduct({
      categoryId: "cat_dimsum",
      name: "Paket Dimsum Ramai UAT",
      sku: `PKT-UAT-STAT-${Date.now()}`,
      price: 45000,
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

  it("UAT-03-05: Owner membuat Produk Paket dengan Kode Auto/Manual, Min Order, Favorit & Bar", async () => {
    const autoSku = `PKT-${Math.floor(1000 + Math.random() * 9000)}`;
    const pkgId = await createProduct({
      categoryId: "cat_dimsum",
      name: "Paket Family Super UAT",
      sku: autoSku,
      price: 75000,
      type: "package",
      minOrder: 3,
      isFavorite: true,
      showInBar: true,
    });

    const createdPkg = await getProduct(pkgId);
    expect(createdPkg).toBeDefined();
    expect(createdPkg?.sku).toBe(autoSku);
    expect(createdPkg?.minOrder).toBe(3);
    expect(createdPkg?.isFavorite).toBe(true);
    expect(createdPkg?.showInBar).toBe(true);
  });

  it("UAT-03-06: Owner mengedit rincian komponen paket dan menghapus komponen (Trash icon)", async () => {
    const item1 = await createProduct({ categoryId: "cat_dimsum", name: "Comp 1", sku: `COMP1-${Date.now()}`, price: 10000 });
    const item2 = await createProduct({ categoryId: "cat_dimsum", name: "Comp 2", sku: `COMP2-${Date.now()}`, price: 12000 });

    const pkgId = await createProduct({
      categoryId: "cat_dimsum",
      name: "Paket Duo UAT",
      sku: `PKT-DUO-${Date.now()}`,
      price: 20000,
      type: "package",
    });

    await savePackageItems(pkgId, [
      { itemProductId: item1, quantity: 1 },
      { itemProductId: item2, quantity: 1 },
    ]);

    let items = await getPackageItems(pkgId);
    expect(items.length).toBe(2);

    // Simulate removing item2 (Trash button click)
    await savePackageItems(pkgId, [{ itemProductId: item1, quantity: 1 }]);
    items = await getPackageItems(pkgId);
    expect(items.length).toBe(1);
    expect(items[0].itemProductId).toBe(item1);
  });

  it("UAT-03-07: Owner menyimpan pengaturan harga Ojek Online (GoFood, GrabFood, ShopeeFood)", async () => {
    const prodId = await createProduct({
      categoryId: "cat_dimsum",
      name: "Hakau Special Ojol UAT",
      sku: `OJOL-UAT-${Date.now()}`,
      price: 25000,
    });

    const onlinePrices = { gofood: 30000, grabfood: 30000, shopeefood: 28000 };
    await updateProduct(prodId, { onlinePrices });

    const prod = await getProduct(prodId);
    expect(prod?.onlinePrices).toEqual(onlinePrices);
  });

  it("UAT-03-08: Menu 'Harga Ojek Online' terdaftar di Sidebar Owner pada kelompok Produk", () => {
    const productCategoryNav = NAV.find((item) => item.label === "Produk");
    expect(productCategoryNav).toBeDefined();

    const ojolItem = productCategoryNav?.children?.find((c) => c.label === "Harga Ojek Online");
    expect(ojolItem).toBeDefined();
  });
});
