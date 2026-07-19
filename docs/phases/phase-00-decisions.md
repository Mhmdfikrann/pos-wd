# Phase 0 — Decisions & Documentation

> **Status:** complete (2026-07-19) · **Depends on:** none · **Unblocks:** all phases
> **PRD:** §22 (Open Questions), §23 (Phase 0), §12 (Business Rules), §17.2 (design tokens)

Read [AGENTS.md](../../AGENTS.md) before starting. **This is not the Next.js in your training data** — read `node_modules/next/dist/docs/` for anything framework-level.

## Goal

Freeze the decisions every later phase depends on, so coding agents never have to guess. This phase produces **documentation only** — no product code.

## Scope

1. Resolve the 15 Open Questions (PRD §22) into concrete defaults.
2. Lock the role → permission matrix (PRD §6).
3. Confirm catalog + recipe seed shape.
4. Confirm architecture decisions (DB, auth, money, outlet scope).

## Decisions locked for MVP (conservative — matches mockups)

These are the Phase-0 defaults chosen for this build. They can be revisited, but later phases assume them.

| # | Open question (PRD §22) | Decision |
|---|---|---|
| 1 | Pajak aktif di MVP? | **Yes — PPN 11%**, shown as a line item (matches Kasir mockup & `outlets.taxPercent` default). |
| 2 | Service charge aktif? | **No** (default 0%; column exists for later). |
| 3 | Dine-in butuh nomor meja? | **Optional** — free-text `tableNo`, not required. |
| 4 | Split payment di MVP? | **No** — one payment per order (Post-MVP, PRD §9). |
| 5 | Batas selisih kas butuh approval owner? | **Any non-zero difference requires a closing note; manager approval flag on close.** Numeric owner threshold deferred. |
| 6 | Kasir boleh diskon manual? | **No manual/ad-hoc discount.** Kasir may only **apply a predefined discount** from the `discounts` table (permission `discount.apply`). Any ad-hoc amount/override is **manager-gated** (approval, Phase 9). See the permission catalog below for how these two cases split. |
| 7 | Partial refund per item? | **Amount-level refund only** at MVP; per-item is Post-MVP. |
| 8 | Stok kemasan berkurang otomatis? | Only if modeled as a recipe item; no separate packaging engine. |
| 9 | Frozen vs matang beda resep? | Modeled via **product variant + versioned recipe** (`recipes.variantId`, `recipes.version`). |
| 10 | Dapur >1 station? | **Yes, supported** — `products.kitchenStation` + `kitchenTickets.station`; mockup filters Kukus/Goreng/Minuman. |
| 11 | Printer dapur di MVP? | **No** physical printer integration; on-screen KDS only. |
| 12 | Order marketplace dicatat manual? | Type badge only (GoFood/Grab) as an order-type label; **no integration** (Non-Goal §5). |
| 13 | Customer DB di MVP? | **Minimal** — `customers` table exists; optional attach to order. Full CRM Post-MVP. |
| 14 | Lama simpan data transaksi? | No purge at MVP; financial rows are soft-delete only (BR-005). |
| 15 | Jumlah kasir bersamaan? | Design for a handful per outlet; no hard cap. |

## Role → capability matrix (locked)

| Capability | Owner | Manager | Kasir | Dapur | Inventory |
|---|:-:|:-:|:-:|:-:|:-:|
| All outlets | ✅ | — (assigned) | — | — | — |
| Manage users/roles/outlets/catalog/price | ✅ | — | — | — | — |
| View reports & audit log | ✅ | outlet | — | — | — |
| Open/close shift, cash in/out | ✅ | ✅ | ✅ (own) | — | — |
| Create & pay order | ✅ | ✅ | ✅ | — | — |
| Approve refund/void/discount/stock adj | ✅ | ✅ | — | — | — |
| Request refund/void | ✅ | ✅ | ✅ | — | — |
| Kitchen ticket status | ✅ | ✅ | — | ✅ | — |
| Inventory movements & opname | ✅ | ✅ | — | — | ✅ |

Enforcement is **server-side** (BR-010, FR-002). See [phase-02-auth-outlet.md](./phase-02-auth-outlet.md).

### Permission catalog → role grants (the seed target)

The capability matrix above is encoded as discrete permission keys. This table is the **contract** `src/db/seed.ts` implements (and is verified against it — see Verification note). Owner holds every key.

| Permission key | Meaning | Owner | Manager | Kasir | Dapur | Inventory |
|---|---|:-:|:-:|:-:|:-:|:-:|
| `pos.operate` | Open POS, build cart | ✅ | ✅ | ✅ | — | — |
| `shift.open` | Open a shift + opening cash | ✅ | ✅ | ✅ | — | — |
| `shift.close` | Close shift + reconcile | ✅ | ✅ | ✅ | — | — |
| `payment.accept` | Take payment, issue receipt | ✅ | ✅ | ✅ | — | — |
| `refund.request` | Request a refund/void | ✅ | ✅ | ✅ | — | — |
| `refund.approve` | Approve a refund | ✅ | ✅ | — | — | — |
| `void.approve` | Approve a void | ✅ | ✅ | — | — | — |
| `discount.apply` | Apply a **predefined** discount | ✅ | ✅ | ✅ | — | — |
| `kitchen.view` | View kitchen board | ✅ | ✅ | — | ✅ | — |
| `kitchen.update` | Advance/return ticket status | ✅ | ✅ | — | ✅ | — |
| `inventory.view` | View stock | ✅ | ✅ | — | — | ✅ |
| `inventory.adjust` | Stock in/out/adjust/opname | ✅ | ✅ | — | — | ✅ |
| `report.view` | View reports | ✅ | ✅ | — | — | ✅ |
| `catalog.manage` | Manage products/prices/recipes | ✅ | — | — | — | — |
| `user.manage` | Manage users/roles | ✅ | — | — | — | — |
| `outlet.manage` | Manage outlets/settings | ✅ | — | — | — | — |
| `audit.view` | View audit log | ✅ | — | — | — | — |

Notes on the locked splits:
- **Discount (Q6):** `discount.apply` = pick a row from the `discounts` table only. It does **not** authorize an ad-hoc amount or price override — that path requires a manager approval (Phase 9), gated by `refund.approve`/`void.approve`-style approval, not a kasir-held key.
- **Manager `report.view` is outlet-scoped** (their assigned outlets only, BR-010); Owner's is all-outlet. Same key, scope enforced server-side.
- **Kasir `shift.close`** closes only the kasir's **own** shift; a non-zero cash difference still needs a closing note and the manager-approval flag (Q5).

### Verification note — current seed vs this target

`src/db/seed.ts` already grants permissions, but as of this writing it **diverges from the locked matrix above in two spots for Manager**. This is recorded here as the target; reconciling the seed is **Phase 4 (seed) work**, not Phase 0 (which is documentation-only):

| Role | Key | This matrix | Current seed | Action (Phase 4) |
|---|---|:-:|:-:|---|
| Manager | `refund.request` | ✅ (can request, then self/owner-approve) | ❌ missing | Add to `role_manager` grants |
| Manager | `kitchen.update` | ✅ (may advance ticket status) | ❌ missing (view only) | Add to `role_manager` grants |

All other role/permission grants in the seed already match this table (Owner=all, Kasir, Dapur, Inventory verified identical). Do **not** edit the seed as part of Phase 0; carry these two rows into the Phase 4 seed checklist.

## Architecture decisions (locked)

- **Money:** integer rupiah everywhere (BR-002); format with `formatRupiah` (`src/lib/format.ts`).
- **DB:** SQLite via Drizzle + better-sqlite3 now; domain layer stays SQLite-agnostic for a future Postgres move (PRD §13.4).
- **Auth:** better-auth (email/username + password), custom PIN plugin for kasir fast-login. `users` table is canonical; better-auth `session`/`account`/`verification` are added alongside. See [phase-02-auth-outlet.md](./phase-02-auth-outlet.md).
- **RBAC source of truth:** the hand-rolled `roles`/`permissions`/`rolePermissions`/`userOutlets` tables — **not** the better-auth admin plugin (which would double-store roles).
- **Stock ledger:** every stock change flows through `stock_movements` (BR-006).
- **Checkout:** single DB transaction; payment idempotency key (BR-003, BR-007).

## Catalog + recipe seed shape (locked)

The seed catalog is the mockup's own data (`src/app/kasir/page.tsx` `PRODUCTS`/`CATS`, `src/app/inventory/page.tsx` `INITIAL_ITEMS`), so the seeded screens match the visual source of truth. This is the **target shape** for the Phase 3 (catalog) and Phase 7 (inventory/recipe) seeds — it is not built here; Phase 0 only freezes it.

**Categories** (`categories`) — 6 sellable groups (Add-on is a category, not a separate table): Dimsum, Kukus, Goreng, Paket, Minuman, Add-on. (`"Semua"` is a UI filter, not a row.)

**Products** (`products`) — 20 rows from the Kasir mockup, integer rupiah, mapped to a category + `kitchenStation`:

| cat | station | examples (name @ price) |
|---|---|---|
| dimsum | Kukus | Dimsum Ayam 18.000, Dimsum Ayam Keju 22.000, Siomay Ayam 20.000, Ceker Dimsum 24.000 |
| kukus | Kukus | Hakau Udang 24.000, Xiao Long Bao 28.000, Mantao Kukus 16.000 |
| goreng | Goreng | Lumpia Udang 20.000, Pangsit Goreng 18.000, Lumpia Kulit Tahu 20.000 |
| paket | Kukus | Paket Hemat A 45.000, Paket Berdua 78.000, Paket Keluarga 145.000 |
| minuman | Minuman | Es Teh Melati 7.000, Es Jeruk 10.000, Teh Tarik 12.000, Air Mineral 5.000 |
| addon | _(none)_ | Saus XO 8.000, Sambal Extra 3.000, Kecap Asin 2.000 |

- Station mapping is confirmed against the Kitchen mockup (`STATIONS` + per-item `station`): dimsum/kukus/paket → Kukus, goreng → Goreng, minuman → Minuman. Add-ons are condiments with **no kitchen prep** → `kitchenStation` is null (the column is nullable).
- SKUs are generated per product (`products.sku`); the mockup ids (`d1`…`a3`) are not SKUs.
- **Variants (Q9):** frozen vs matang etc. are `product_variants` with a `priceDelta` + a versioned recipe (`recipes.variantId`, `recipes.version`). None are seeded at MVP; the shape exists for Phase 7.
- **Availability** maps from the mockup stock tag: `ok`/`low` → `available = true`, `out` → `available = false`.

**Inventory items** (`inventory_items`) — 15 rows from the Inventory mockup, 4 categories, integer rupiah unit cost:

| category | examples (name · SKU · unit) |
|---|---|
| bahan | Kulit Dimsum · BB-001 · pack; Daging Ayam Giling · BB-002 · kg; Udang Kupas · BB-003 · kg; Tepung Tapioka · BB-004 · kg; Jamur Kuping Kering · BB-005 · kg; Saus XO · BB-006 · botol; Minyak Goreng · BB-007 · liter |
| kemasan | Kemasan Takeaway M · KM-001 · pcs; Kemasan Takeaway L · KM-002 · pcs; Paper Bag Bermerek · KM-003 · pcs; Sumpit + Sendok Set · KM-004 · set |
| minuman | Teh Melati Kering · MN-001 · pack; Sirup Jeruk · MN-002 · botol |
| operasional | Gas LPG 12kg · OP-001 · tabung; Tisu Makan · OP-002 · pack |

- Per-outlet levels (`qty`, `min`) live in `outlet_stock` (BR-010), not on the item; the mockup's `qty`/`min` seed the default outlet's row. Opening stock is posted as an `in` `stock_movements` row (BR-006), never written directly.
- The mockup's `exp` (days-to-expiry) is a display concern; expiry batches are Post-MVP and not modeled at MVP.

**Recipes** (`recipes` + `recipe_items`) — the product→ingredient links that drive auto-deduction (FR-013/BR-013). **Not seeded at MVP** (PRD Q9 keeps recipe depth open); the shape is: one active `recipes` row per product (optionally per variant, versioned), each with `recipe_items` referencing `inventory_items` by `quantity` in the item's unit. Phase 7 owns building these.

## Acceptance criteria

- [x] All 15 open questions have a recorded default (table above).
- [x] Role matrix agreed and encoded as the seed target — permission catalog above is the contract; two Manager rows (`refund.request`, `kitchen.update`) flagged for the Phase 4 seed to reconcile.
- [x] Catalog + recipe seed shape confirmed (grounded in the mockup data).
- [x] No open architectural questions remain that block Phase 1.

## Definition of Done

Documentation-only phase — DoD = decisions recorded here and linked from [README.md](./README.md). No lint/build/test gate.

**Status: complete (2026-07-19).** Downstream carry-overs: Phase 4 seed reconciles the two flagged Manager permissions; Phase 3/7 build the catalog/inventory/recipe seeds to the shape frozen above.
