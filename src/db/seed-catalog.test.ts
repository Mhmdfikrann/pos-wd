/**
 * Seed catalog data-integrity tests (Phase 3).
 *
 * These guard the *shape* of the seed data, not the DB write — they catch
 * regressions like a duplicate SKU, a product pointing at a missing category,
 * or the Kasir initial-cart ids drifting away from the seeded products.
 */
import { describe, it, expect } from "vitest";
import { SEED_CATEGORIES, SEED_PRODUCTS } from "./catalog-data";

describe("seed catalog integrity", () => {
  it("has the 6 Phase-0 categories", () => {
    expect(SEED_CATEGORIES).toHaveLength(6);
  });

  it("has 20 products (verbatim from the Kasir mockup)", () => {
    expect(SEED_PRODUCTS).toHaveLength(20);
  });

  it("every product references a seeded category", () => {
    const catIds = new Set<string>(SEED_CATEGORIES.map((c) => c.id));
    for (const p of SEED_PRODUCTS) {
      expect(catIds.has(p.categoryId), `${p.id} → ${p.categoryId}`).toBe(true);
    }
  });

  it("product ids are unique", () => {
    const ids = SEED_PRODUCTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("SKUs are unique", () => {
    const skus = SEED_PRODUCTS.map((p) => p.sku);
    expect(new Set(skus).size).toBe(skus.length);
  });

  it("category sortOrder values are unique", () => {
    const orders = SEED_CATEGORIES.map((c) => c.sortOrder);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it("prices are positive integers (BR-002)", () => {
    for (const p of SEED_PRODUCTS) {
      expect(Number.isInteger(p.price), p.id).toBe(true);
      expect(p.price).toBeGreaterThan(0);
    }
  });

  it("keeps the Kasir initial-cart ids (d1/h1/m1) present", () => {
    // KasirClient seeds the cart with these ids; if they vanish the cart breaks.
    const ids = new Set(SEED_PRODUCTS.map((p) => p.id));
    for (const id of ["d1", "h1", "m1"]) {
      expect(ids.has(id), id).toBe(true);
    }
  });

  it("marks exactly the mockup's out-of-stock product unavailable", () => {
    const unavailable = SEED_PRODUCTS.filter((p) => p.available === false).map((p) => p.id);
    expect(unavailable).toEqual(["g3"]);
  });
});
