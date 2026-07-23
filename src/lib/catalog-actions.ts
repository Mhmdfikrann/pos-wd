"use server";

/**
 * Catalog management server actions (PRD §8.3, FR-003, BR-012, §8.10).
 *
 * Every mutation here is the AUTHORITATIVE enforcement point:
 *  1. `requirePermission("catalog.manage")` — only Owner holds this (Phase 0).
 *  2. Validate + normalize input server-side (never trust the client).
 *  3. Call the pure `catalog.ts` data layer.
 *  4. Audit sensitive changes — price edits especially (§8.10).
 *  5. `revalidatePath` so the Owner tables and the Kasir grid re-read.
 *
 * Actions return a discriminated result `{ ok: true, ... } | { ok: false, error }`
 * rather than throwing, so client forms can render a clean Indonesian message.
 * (A thrown PermissionError still surfaces as a generic failure — defense in depth.)
 */
import { revalidatePath } from "next/cache";
import { requirePermission, PermissionError } from "@/lib/session";
import { writeAudit } from "@/lib/audit";
import { cleanName, cleanRupiah, cleanSku } from "@/lib/catalog-validation";
import {
  listCategories,
  listProducts,
  listAddons,
  createCategory,
  updateCategory,
  deactivateCategory,
  createProduct,
  updateProduct,
  setProductAvailability,
  deactivateProduct,
  getProduct,
  listVariants,
  createVariant,
  updateVariant,
  deactivateVariant,
  createAddon,
  updateAddon,
  deactivateAddon,
  listInventoryItemsSimple,
  getProductRecipe,
  saveProductRecipe,
  getPackageItems,
  savePackageItems,
  getProductAddons,
  saveProductAddons,
} from "@/lib/catalog";

const PERM = "catalog.manage";

export type ActionResult<T = void> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

/** Re-read every surface that renders catalog data. */
function revalidateCatalog() {
  revalidatePath("/kasir");
  revalidatePath("/owner");
}

/** Wrap an action body with the permission gate + uniform error handling. */
async function guarded<T>(
  body: (session: Awaited<ReturnType<typeof requirePermission>>) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    const session = await requirePermission(PERM);
    return await body(session);
  } catch (err) {
    if (err instanceof PermissionError) {
      return { ok: false, error: "Anda tidak punya izin mengelola katalog." };
    }
    // Unique-constraint (duplicate SKU) and the like land here.
    const msg = err instanceof Error ? err.message : String(err);
    if (/UNIQUE|unique/.test(msg)) {
      return { ok: false, error: "SKU sudah dipakai produk lain." };
    }
    console.error("[catalog-action] failed:", err);
    return { ok: false, error: "Gagal menyimpan. Coba lagi." };
  }
}

// ===== Category actions =====
export async function actionCreateCategory(input: { name: string; sortOrder?: number }) {
  return guarded(async () => {
    const id = await createCategory({ name: cleanName(input.name), sortOrder: input.sortOrder });
    revalidateCatalog();
    return { ok: true, id };
  });
}

export async function actionUpdateCategory(
  id: string,
  patch: { name?: string; sortOrder?: number; active?: boolean },
) {
  return guarded(async () => {
    await updateCategory(id, {
      ...(patch.name !== undefined ? { name: cleanName(patch.name) } : {}),
      ...(patch.sortOrder !== undefined ? { sortOrder: patch.sortOrder } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
    });
    revalidateCatalog();
    return { ok: true };
  });
}

export async function actionDeactivateCategory(id: string) {
  return guarded(async () => {
    await deactivateCategory(id);
    revalidateCatalog();
    return { ok: true };
  });
}

// ===== Product actions =====
export async function actionCreateProduct(input: {
  categoryId: string;
  name: string;
  sku: string;
  price: number;
  costPrice?: number;
  unit?: string;
  type?: "single" | "package";
  minOrder?: number;
  isFavorite?: boolean;
  showInBar?: boolean;
  kitchenStation?: string | null;
  available?: boolean;
}): Promise<ActionResult<{ id: string }>> {
  return guarded<{ id: string }>(async (session) => {
    const id = await createProduct({
      categoryId: input.categoryId,
      name: cleanName(input.name),
      sku: cleanSku(input.sku),
      price: cleanRupiah(input.price, "Harga"),
      costPrice: input.costPrice === undefined ? 0 : cleanRupiah(input.costPrice, "Harga modal"),
      unit: input.unit ? input.unit.trim() : "porsi",
      type: input.type ?? "single",
      minOrder: input.minOrder ?? 1,
      isFavorite: input.isFavorite ?? false,
      showInBar: input.showInBar ?? false,
      kitchenStation: input.kitchenStation ?? null,
      available: input.available ?? true,
    });
    await writeAudit({
      action: "catalog.product_create",
      actorId: session.userId,
      entity: "product",
      entityId: id,
      detail: { name: input.name, price: input.price },
    });
    revalidateCatalog();
    return { ok: true, id };
  });
}

export async function actionUpdateProduct(
  id: string,
  patch: {
    categoryId?: string;
    name?: string;
    sku?: string;
    price?: number;
    costPrice?: number;
    unit?: string;
    type?: "single" | "package";
    minOrder?: number;
    isFavorite?: boolean;
    showInBar?: boolean;
    kitchenStation?: string | null;
    available?: boolean;
  },
) {
  return guarded(async (session) => {
    const before = await getProduct(id);
    if (!before) return { ok: false, error: "Produk tidak ditemukan." };

    await updateProduct(id, {
      ...(patch.categoryId !== undefined ? { categoryId: patch.categoryId } : {}),
      ...(patch.name !== undefined ? { name: cleanName(patch.name) } : {}),
      ...(patch.sku !== undefined ? { sku: cleanSku(patch.sku) } : {}),
      ...(patch.price !== undefined ? { price: cleanRupiah(patch.price, "Harga") } : {}),
      ...(patch.costPrice !== undefined ? { costPrice: cleanRupiah(patch.costPrice, "Harga modal") } : {}),
      ...(patch.unit !== undefined ? { unit: patch.unit.trim() } : {}),
      ...(patch.type !== undefined ? { type: patch.type } : {}),
      ...(patch.minOrder !== undefined ? { minOrder: patch.minOrder } : {}),
      ...(patch.isFavorite !== undefined ? { isFavorite: patch.isFavorite } : {}),
      ...(patch.showInBar !== undefined ? { showInBar: patch.showInBar } : {}),
      ...(patch.kitchenStation !== undefined ? { kitchenStation: patch.kitchenStation } : {}),
      ...(patch.available !== undefined ? { available: patch.available } : {}),
    });

    // Price change is a sensitive, audited event (§8.10).
    if (patch.price !== undefined && patch.price !== before.price) {
      await writeAudit({
        action: "catalog.price_change",
        actorId: session.userId,
        entity: "product",
        entityId: id,
        detail: { name: before.name, from: before.price, to: patch.price },
      });
    }
    revalidateCatalog();
    return { ok: true };
  });
}

export async function actionSetProductAvailability(id: string, available: boolean) {
  return guarded(async () => {
    await setProductAvailability(id, available);
    revalidateCatalog();
    return { ok: true };
  });
}

export async function actionDeactivateProduct(id: string) {
  return guarded(async (session) => {
    await deactivateProduct(id);
    await writeAudit({
      action: "catalog.product_deactivate",
      actorId: session.userId,
      entity: "product",
      entityId: id,
    });
    revalidateCatalog();
    return { ok: true };
  });
}

export async function actionDeleteProduct(id: string) {
  return guarded(async (session) => {
    await deactivateProduct(id);
    await writeAudit({
      action: "catalog.product_delete",
      actorId: session.userId,
      entity: "product",
      entityId: id,
    });
    revalidateCatalog();
    return { ok: true };
  });
}

export async function actionDeleteCategory(id: string) {
  return guarded(async (session) => {
    await deactivateCategory(id);
    await writeAudit({
      action: "catalog.category_delete",
      actorId: session.userId,
      entity: "category",
      entityId: id,
    });
    revalidateCatalog();
    return { ok: true };
  });
}

// ===== Variant actions =====
export async function actionCreateVariant(input: {
  productId: string;
  name: string;
  sku?: string | null;
  priceDelta?: number;
}) {
  return guarded(async () => {
    const id = await createVariant({
      productId: input.productId,
      name: cleanName(input.name),
      sku: input.sku ? cleanSku(input.sku) : null,
      priceDelta: input.priceDelta ?? 0,
    });
    revalidateCatalog();
    return { ok: true, id };
  });
}

export async function actionUpdateVariant(
  id: string,
  patch: { name?: string; sku?: string | null; priceDelta?: number; active?: boolean },
) {
  return guarded(async () => {
    await updateVariant(id, {
      ...(patch.name !== undefined ? { name: cleanName(patch.name) } : {}),
      ...(patch.sku !== undefined ? { sku: patch.sku ? cleanSku(patch.sku) : null } : {}),
      ...(patch.priceDelta !== undefined ? { priceDelta: patch.priceDelta } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
    });
    revalidateCatalog();
    return { ok: true };
  });
}

export async function actionDeactivateVariant(id: string) {
  return guarded(async () => {
    await deactivateVariant(id);
    revalidateCatalog();
    return { ok: true };
  });
}

// ===== Add-on actions =====
export async function actionCreateAddon(input: {
  name: string;
  price?: number;
  isMandatory?: boolean;
  selectMode?: "single" | "multiple";
}) {
  return guarded(async () => {
    const id = await createAddon({
      name: cleanName(input.name),
      price: input.price === undefined ? 0 : cleanRupiah(input.price, "Harga"),
      isMandatory: input.isMandatory ?? false,
      selectMode: input.selectMode ?? "multiple",
    });
    revalidateCatalog();
    return { ok: true, id };
  });
}

export async function actionUpdateAddon(
  id: string,
  patch: {
    name?: string;
    price?: number;
    isMandatory?: boolean;
    selectMode?: "single" | "multiple";
    active?: boolean;
  },
) {
  return guarded(async () => {
    await updateAddon(id, {
      ...(patch.name !== undefined ? { name: cleanName(patch.name) } : {}),
      ...(patch.price !== undefined ? { price: cleanRupiah(patch.price, "Harga") } : {}),
      ...(patch.isMandatory !== undefined ? { isMandatory: patch.isMandatory } : {}),
      ...(patch.selectMode !== undefined ? { selectMode: patch.selectMode } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
    });
    revalidateCatalog();
    return { ok: true };
  });
}

export async function actionDeactivateAddon(id: string) {
  return guarded(async () => {
    await deactivateAddon(id);
    revalidateCatalog();
    return { ok: true };
  });
}

export interface BulkProductInput {
  name: string;
  sku: string;
  categoryName: string;
  price: number;
  costPrice?: number;
  unit?: string;
  kitchenStation?: string | null;
}

export async function actionImportProducts(items: BulkProductInput[]) {
  return guarded<{ createdCount: number; updatedCount: number }>(async (session) => {
    if (!Array.isArray(items) || items.length === 0) {
      return { ok: false, error: "Data impor kosong." };
    }

    const [existingCategories, existingProducts] = await Promise.all([
      listCategories(true),
      listProducts({ includeInactive: true }),
    ]);

    const categoryMap = new Map<string, string>();
    for (const cat of existingCategories) {
      categoryMap.set(cat.name.toLowerCase().trim(), cat.id);
    }

    const productMap = new Map<string, typeof existingProducts[0]>();
    for (const prod of existingProducts) {
      productMap.set(prod.sku.toLowerCase().trim(), prod);
    }

    let createdCount = 0;
    let updatedCount = 0;

    for (const item of items) {
      const trimmedCatName = cleanName(item.categoryName || "Umum");
      const catKey = trimmedCatName.toLowerCase();
      let categoryId = categoryMap.get(catKey);

      if (!categoryId) {
        categoryId = await createCategory({ name: trimmedCatName });
        categoryMap.set(catKey, categoryId);
      }

      const trimmedName = cleanName(item.name);
      const trimmedSku = cleanSku(item.sku);
      const price = cleanRupiah(item.price, "Harga");
      const costPrice = item.costPrice === undefined ? 0 : cleanRupiah(item.costPrice, "Harga modal");
      const unit = item.unit ? item.unit.trim() : "porsi";
      const kitchenStation = item.kitchenStation ?? null;

      const existingProd = productMap.get(trimmedSku.toLowerCase());
      if (existingProd) {
        await updateProduct(existingProd.id, {
          categoryId,
          name: trimmedName,
          sku: trimmedSku,
          price,
          costPrice,
          unit,
          kitchenStation,
          active: true,
        });
        updatedCount++;
      } else {
        const id = await createProduct({
          categoryId,
          name: trimmedName,
          sku: trimmedSku,
          price,
          costPrice,
          unit,
          kitchenStation,
          available: true,
        });
        productMap.set(trimmedSku.toLowerCase(), {
          id,
          categoryId,
          name: trimmedName,
          sku: trimmedSku,
          price,
          costPrice,
          unit,
          type: "single",
          minOrder: 1,
          isFavorite: false,
          showInBar: false,
          onlinePrices: null,
          kitchenStation,
          photoUrl: null,
          available: true,
          active: true,
        });
        createdCount++;
      }
    }

    await writeAudit({
      action: "catalog.bulk_import",
      actorId: session.userId,
      entity: "catalog",
      detail: { count: items.length, createdCount, updatedCount },
    });

    revalidateCatalog();
    return { ok: true, createdCount, updatedCount };
  });
}

// ===== Read (admin view) =====
// The Owner manager needs inactive rows too (to un-deactivate / audit), so these
// read actions are gated on the same permission and return everything.
export async function actionLoadCatalog() {
  return guarded(async () => {
    const [cats, prods, adds] = await Promise.all([
      listCategories(true),
      listProducts({ includeInactive: true }),
      listAddons(true),
    ]);
    return { ok: true, categories: cats, products: prods, addons: adds };
  });
}

export async function actionGetProductDetails(productId: string) {
  return guarded<{
    variants: Awaited<ReturnType<typeof listVariants>>;
    recipe: Awaited<ReturnType<typeof getProductRecipe>>;
    inventoryItems: Awaited<ReturnType<typeof listInventoryItemsSimple>>;
    packageItems: Awaited<ReturnType<typeof getPackageItems>>;
    productAddonIds: Awaited<ReturnType<typeof getProductAddons>>;
  }>(async () => {
    const [variants, recipe, inventoryItems, packageItems, productAddonIds] = await Promise.all([
      listVariants(productId),
      getProductRecipe(productId),
      listInventoryItemsSimple(),
      getPackageItems(productId),
      getProductAddons(productId),
    ]);
    return { ok: true, variants, recipe, inventoryItems, packageItems, productAddonIds };
  });
}

export async function actionSaveProductDetails(
  productId: string,
  variants: { id?: string; name: string; priceDelta: number }[],
  recipe: { inventoryItemId: string; quantity: number }[],
  packageItemsInput?: { itemProductId: string; quantity: number }[],
  addonIdsInput?: string[],
) {
  return guarded(async () => {
    const currentVariants = await listVariants(productId, true);
    const activeIds = new Set<string>();

    for (const v of variants) {
      if (v.id) {
        activeIds.add(v.id);
        await updateVariant(v.id, { name: cleanName(v.name), priceDelta: v.priceDelta, active: true });
      } else {
        const id = await createVariant({ productId, name: cleanName(v.name), priceDelta: v.priceDelta });
        activeIds.add(id);
      }
    }

    for (const curr of currentVariants) {
      if (!activeIds.has(curr.id) && curr.active) {
        await deactivateVariant(curr.id);
      }
    }

    await saveProductRecipe(productId, recipe);
    if (packageItemsInput) {
      await savePackageItems(productId, packageItemsInput);
    }
    if (addonIdsInput) {
      await saveProductAddons(productId, addonIdsInput);
    }
    revalidateCatalog();
    return { ok: true };
  });
}

export async function actionUpdateOnlinePrices(
  productId: string,
  onlinePrices: Record<string, number>,
) {
  return guarded(async () => {
    await updateProduct(productId, { onlinePrices });
    revalidateCatalog();
    return { ok: true };
  });
}

export async function actionBatchUpdateOnlinePrices(
  updates: { id: string; onlinePrices: Record<string, number> }[],
) {
  return guarded(async () => {
    for (const u of updates) {
      await updateProduct(u.id, { onlinePrices: u.onlinePrices });
    }
    revalidateCatalog();
    return { ok: true };
  });
}
