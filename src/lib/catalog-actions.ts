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
  createVariant,
  updateVariant,
  deactivateVariant,
  createAddon,
  updateAddon,
  deactivateAddon,
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
  kitchenStation?: string | null;
  available?: boolean;
}) {
  return guarded(async (session) => {
    const id = await createProduct({
      categoryId: input.categoryId,
      name: cleanName(input.name),
      sku: cleanSku(input.sku),
      price: cleanRupiah(input.price, "Harga"),
      costPrice: input.costPrice === undefined ? 0 : cleanRupiah(input.costPrice, "Harga modal"),
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
export async function actionCreateAddon(input: { name: string; price?: number }) {
  return guarded(async () => {
    const id = await createAddon({
      name: cleanName(input.name),
      price: input.price === undefined ? 0 : cleanRupiah(input.price, "Harga"),
    });
    revalidateCatalog();
    return { ok: true, id };
  });
}

export async function actionUpdateAddon(
  id: string,
  patch: { name?: string; price?: number; active?: boolean },
) {
  return guarded(async () => {
    await updateAddon(id, {
      ...(patch.name !== undefined ? { name: cleanName(patch.name) } : {}),
      ...(patch.price !== undefined ? { price: cleanRupiah(patch.price, "Harga") } : {}),
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
