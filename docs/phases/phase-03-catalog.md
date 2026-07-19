# Phase 3 — Catalog

> **Status:** complete (2026-07-19) · **Depends on:** [Phase 2](./phase-02-auth-outlet.md) · **Unblocks:** [Phase 5 (POS)](./phase-05-pos-payment.md), [Phase 7 (Inventory/Recipe)](./phase-07-inventory.md)
> **PRD:** §8.3, FR-003, BR-012

Read [AGENTS.md](../../AGENTS.md) first.

## Goal

Manage the product catalog behind the screens that currently render from hardcoded constants. Wire the mock catalog to `src/db`.

## Scope

- Category, Product, Variant, Add-on, SKU.
- Price + cost price (integer rupiah, BR-002).
- Photo, availability, kitchen station.

## Current state (audit)

- Kasir renders `PRODUCTS` constant (`src/app/kasir/page.tsx`); Owner catalog pages (`Buku Menu`, `Master Resep`, `Daftar Kategori`) are archetype templates from `tableData.ts`.
- Schema ready: `categories`, `products`, `productVariants`, `addons` in `src/db/schema.ts`.

## Work

1. Catalog read services (outlet-aware where relevant); replace Kasir `PRODUCTS` with DB-backed data.
2. Owner catalog management CRUD: category, product (price/cost/station/photo/availability), variant, add-on.
3. **Soft delete only** (BR-012) — `active` flag, never hard delete.
4. Price changes → audit log (§8.10).
5. Seed a real Wanna Dimsum catalog (Phase 0 deliverable) so downstream phases have data.

## Acceptance criteria

- [x] Admin/Owner CRUD for category/product/variant/add-on with server-side validation. *`CatalogManager` (Owner suite) → server actions gated on `catalog.manage`; validation in `catalog-validation.ts` (name/rupiah/SKU), unit-tested.*
- [x] Availability toggle hides product from POS without deleting it. *`actionSetProductAvailability`; unavailable → "Habis" + non-clickable in Kasir. Soft delete (`active`) is separate, BR-012.*
- [x] Price edits are audited. *`actionUpdateProduct` writes `catalog.price_change` (from→to) via `writeAudit`; create/deactivate audited too.*
- [x] Kasir product grid reads from DB, not `PRODUCTS`. *`/kasir` is now a server component (`page.tsx`) reading `listProducts`/`listCategories`; UI moved to `KasirClient.tsx`. Verified: build renders `/kasir` dynamically; DB has 6 cats / 20 products.*

## What shipped this phase

- `src/db/catalog-data.ts` — pure seed constants (6 categories, 20 products, verbatim mockup ids + Phase-0 station map); `src/db/seed-catalog.ts` — seeding routine, wired into `db:seed`.
- `src/lib/catalog.ts` — data-access layer (list/get/create/update/deactivate for category/product/variant/add-on; soft delete only, BR-012).
- `src/lib/catalog-validation.ts` — pure validators (`cleanName`/`cleanRupiah`/`cleanSku`), unit-tested.
- `src/lib/catalog-actions.ts` — `"use server"` mutations + admin read, gated on `catalog.manage` (via `requirePermission`), price/create/deactivate audited, `revalidatePath` for `/kasir` + `/owner`.
- `src/lib/session.ts` — `loadPermissions`/`hasPermission`/`requirePermission` + `PermissionError` (RBAC enforcement point).
- `src/app/kasir/page.tsx` (server) + `KasirClient.tsx` (UI) — Kasir grid now DB-backed.
- `src/components/owner/CatalogManager.tsx` — bespoke DB-backed CRUD (products/categories/add-ons tabs, create/edit modal, availability toggle, soft delete), wired into the Owner `PageEl` router for Buku Menu / Daftar Kategori / Produk Ekstra.
- Tests: `catalog-validation.test.ts`, `seed-catalog.test.ts` (42 tests total, green).

## Definition of Done

PRD §24 gate: typecheck + lint + build + tests (42) green. Manual verification: seed populates catalog; Kasir reads DB. `catalog.manage` held only by Owner (Phase 0 matrix), so Owner is the sole catalog editor at MVP.
