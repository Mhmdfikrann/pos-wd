/**
 * Catalog seeding routine (Phase 3, PRD §8.3).
 *
 * The seed *data* lives in the pure, DB-free `./catalog-data` module so it can
 * be unit-tested without a live env. This file just writes it. Idempotent:
 * every insert uses onConflictDoNothing, keyed on the fixed ids. Product cost
 * price isn't in the mockup, so it defaults to 0 — margin reporting fills it
 * in later.
 */
import { categories, products } from "./schema";
import { db as defaultDb } from "./index";
import { SEED_CATEGORIES, SEED_PRODUCTS, STATION } from "./catalog-data";

type Db = typeof defaultDb;

export { SEED_CATEGORIES, SEED_PRODUCTS } from "./catalog-data";

export async function seedCatalog(db: Db = defaultDb): Promise<void> {
  for (const c of SEED_CATEGORIES) {
    await db.insert(categories).values(c).onConflictDoNothing();
  }
  for (const p of SEED_PRODUCTS) {
    await db
      .insert(products)
      .values({
        id: p.id,
        categoryId: p.categoryId,
        name: p.name,
        sku: p.sku,
        price: p.price,
        costPrice: 0,
        kitchenStation: STATION[p.categoryId],
        available: p.available ?? true,
        active: true,
      })
      .onConflictDoNothing();
  }
}
