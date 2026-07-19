# Phase 3 — Catalog

> **Status:** planned · **Depends on:** [Phase 2](./phase-02-auth-outlet.md) · **Unblocks:** [Phase 5 (POS)](./phase-05-pos-payment.md), [Phase 7 (Inventory/Recipe)](./phase-07-inventory.md)
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

- [ ] Admin/Owner CRUD for category/product/variant/add-on with server-side validation.
- [ ] Availability toggle hides product from POS without deleting it.
- [ ] Price edits are audited.
- [ ] Kasir product grid reads from DB, not `PRODUCTS`.

## Definition of Done

PRD §24 gate.
