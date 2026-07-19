/**
 * Catalog data-access layer (PRD §8.3, FR-003, BR-012).
 *
 * Pure DB reads/writes for categories, products, variants, and add-ons. This
 * layer does NOT authorize — the server-action layer (`catalog-actions.ts`)
 * gates on `catalog.manage` and writes the audit log before calling in here.
 * Keeping data access auth-free keeps it reusable (Kasir read path, seed, tests)
 * and keeps the enforcement point in one obvious place.
 *
 * Conventions:
 *  - Money is integer rupiah (BR-002).
 *  - Master data is soft-deleted via `active` (BR-012) — never hard delete.
 *  - Reads default to active rows only; pass `includeInactive` for admin views.
 *
 * Server-only — never import from a client component.
 */
import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, products, productVariants, addons } from "@/db/schema";

// ===== Types =====
export interface CatalogProduct {
  id: string;
  categoryId: string;
  name: string;
  sku: string;
  price: number;
  costPrice: number;
  kitchenStation: string | null;
  photoUrl: string | null;
  available: boolean;
  active: boolean;
}

export interface CatalogCategory {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
}

// ===== Categories =====
export async function listCategories(includeInactive = false): Promise<CatalogCategory[]> {
  const rows = await db
    .select()
    .from(categories)
    .where(includeInactive ? undefined : eq(categories.active, true))
    .orderBy(asc(categories.sortOrder), asc(categories.name))
    .all();
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    sortOrder: c.sortOrder,
    active: c.active,
  }));
}

export async function createCategory(input: {
  name: string;
  sortOrder?: number;
}): Promise<string> {
  const id = randomUUID();
  await db.insert(categories).values({
    id,
    name: input.name,
    sortOrder: input.sortOrder ?? 0,
  });
  return id;
}

export async function updateCategory(
  id: string,
  patch: Partial<{ name: string; sortOrder: number; active: boolean }>,
): Promise<void> {
  await db
    .update(categories)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(eq(categories.id, id));
}

/** Soft delete (BR-012) — flips `active` to false, keeps the row. */
export async function deactivateCategory(id: string): Promise<void> {
  await updateCategory(id, { active: false });
}

// ===== Products =====
export async function listProducts(opts?: {
  includeInactive?: boolean;
  categoryId?: string;
}): Promise<CatalogProduct[]> {
  const filters = [];
  if (!opts?.includeInactive) filters.push(eq(products.active, true));
  if (opts?.categoryId) filters.push(eq(products.categoryId, opts.categoryId));

  const rows = await db
    .select()
    .from(products)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(asc(products.name))
    .all();
  return rows.map(mapProduct);
}

export async function getProduct(id: string): Promise<CatalogProduct | null> {
  const row = await db.select().from(products).where(eq(products.id, id)).get();
  return row ? mapProduct(row) : null;
}

export async function createProduct(input: {
  categoryId: string;
  name: string;
  sku: string;
  price: number;
  costPrice?: number;
  kitchenStation?: string | null;
  photoUrl?: string | null;
  available?: boolean;
}): Promise<string> {
  const id = randomUUID();
  await db.insert(products).values({
    id,
    categoryId: input.categoryId,
    name: input.name,
    sku: input.sku,
    price: input.price,
    costPrice: input.costPrice ?? 0,
    kitchenStation: input.kitchenStation ?? null,
    photoUrl: input.photoUrl ?? null,
    available: input.available ?? true,
  });
  return id;
}

export async function updateProduct(
  id: string,
  patch: Partial<{
    categoryId: string;
    name: string;
    sku: string;
    price: number;
    costPrice: number;
    kitchenStation: string | null;
    photoUrl: string | null;
    available: boolean;
    active: boolean;
  }>,
): Promise<void> {
  await db
    .update(products)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(eq(products.id, id));
}

/** Availability toggle — hides from POS without deleting (AC). */
export async function setProductAvailability(id: string, available: boolean): Promise<void> {
  await updateProduct(id, { available });
}

/** Soft delete (BR-012). */
export async function deactivateProduct(id: string): Promise<void> {
  await updateProduct(id, { active: false });
}

function mapProduct(row: typeof products.$inferSelect): CatalogProduct {
  return {
    id: row.id,
    categoryId: row.categoryId,
    name: row.name,
    sku: row.sku,
    price: row.price,
    costPrice: row.costPrice,
    kitchenStation: row.kitchenStation,
    photoUrl: row.photoUrl,
    available: row.available,
    active: row.active,
  };
}

// ===== Variants =====
export async function listVariants(productId: string, includeInactive = false) {
  const filters = [eq(productVariants.productId, productId)];
  if (!includeInactive) filters.push(eq(productVariants.active, true));
  return db
    .select()
    .from(productVariants)
    .where(and(...filters))
    .orderBy(asc(productVariants.name))
    .all();
}

export async function createVariant(input: {
  productId: string;
  name: string;
  sku?: string | null;
  priceDelta?: number;
}): Promise<string> {
  const id = randomUUID();
  await db.insert(productVariants).values({
    id,
    productId: input.productId,
    name: input.name,
    sku: input.sku ?? null,
    priceDelta: input.priceDelta ?? 0,
  });
  return id;
}

export async function updateVariant(
  id: string,
  patch: Partial<{ name: string; sku: string | null; priceDelta: number; active: boolean }>,
): Promise<void> {
  await db.update(productVariants).set(patch).where(eq(productVariants.id, id));
}

export async function deactivateVariant(id: string): Promise<void> {
  await updateVariant(id, { active: false });
}

// ===== Add-ons =====
export async function listAddons(includeInactive = false) {
  return db
    .select()
    .from(addons)
    .where(includeInactive ? undefined : eq(addons.active, true))
    .orderBy(asc(addons.name))
    .all();
}

export async function createAddon(input: { name: string; price?: number }): Promise<string> {
  const id = randomUUID();
  await db.insert(addons).values({ id, name: input.name, price: input.price ?? 0 });
  return id;
}

export async function updateAddon(
  id: string,
  patch: Partial<{ name: string; price: number; active: boolean }>,
): Promise<void> {
  await db.update(addons).set(patch).where(eq(addons.id, id));
}

export async function deactivateAddon(id: string): Promise<void> {
  await updateAddon(id, { active: false });
}
