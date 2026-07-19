# Phase 6 — Kitchen Display System

> Bagian dari rangkaian fase Wanna Dimsum POS. Baca **[AGENTS.md](../../AGENTS.md)** lebih dulu — konvensi, stack, dan aturan "This is NOT the Next.js you know" berlaku penuh. Indeks fase: **[README.md](./README.md)**.

**Status:** complete (2026-07-19).
**PRD refs:** §8.6 (KDS), §10.3 (Kitchen Processing), FR-008, BR-015.
**Depends on:** [Phase 5](./phase-05-pos-payment.md) (paid order → ticket).
**Blocks:** —

---

## Tujuan

Menghubungkan Kitchen Display (`src/app/kitchen/page.tsx`, port faithful) ke `kitchenTickets` nyata: tiket muncul saat order paid, status maju/mundur tervalidasi, real-time via short polling.

## Kondisi frontend saat ini (terverifikasi)

`/kitchen` lengkap: papan 3 status (Baru → Sedang Dimasak → Siap Antar), filter stasiun, timer aging live (warn 5m / alert 10m), bump/recall, checklist per item. `INITIAL_TICKETS` = 7 tiket mock, `useState`.

## Scope

- Kitchen ticket dibuat saat payment berhasil (BR-015) — koordinasi Phase 5.
- Status lifecycle: `new → accepted → preparing → ready → completed` (+ `cancelled`).
- Validasi transisi state (tolak transisi invalid).
- Actor + timestamp tiap perubahan status.
- Outlet scoping (tiket hanya tampil di outlet-nya).
- Short polling atau revalidation untuk near-real-time (<3s, NFR §13.1).

## Acceptance criteria (PRD §10.3)

- [x] Pesanan hanya tampil pada outlet yang sesuai (BR-010). *`listKitchenTickets` menerima daftar `outletIds` dari session server-side; API polling juga memakai `scopedOutletIds`. Cross-outlet mutation ditolak dan diuji.*
- [x] Setiap perubahan status punya actor + timestamp (`acceptedAt`, `readyAt`, `completedAt`). *Migration `0003_tearful_mesmero.sql` menambah `acceptedById`, `readyById`, `completedById`; service menulis actor + timestamp pada milestone preparing/ready/completed.*
- [x] Invalid state transition ditolak server-side. *`kitchen-core.ts` memvalidasi transition graph; `new → ready` dan mutasi lintas-outlet diuji.*
- [x] Kitchen ticket tidak tampil ganda (idempotent creation dari Phase 5). *Unique index Phase 5 tetap menjadi guard; Phase 6 list menggabungkan item per order dan station filter tanpa menduplikasi ticket multi-item.*

## Data model

`kitchenTickets` sudah lengkap: `status` enum, `station`, `acceptedAt/readyAt/completedAt`, `outletId` index.

## What shipped this phase

- `src/lib/kitchen-core.ts` — pure KDS rules: transition validation, board status mapping, visible next/previous status, station normalization.
- `src/lib/kitchen-data.ts` — DB-parameterized list + transition service, tested against in-memory SQLite with real migrations.
- `src/lib/kitchen.ts` — server-only wrapper bound to the app DB.
- `src/lib/kitchen-actions.ts` — `actionTransitionKitchenTicket`, gated by `kitchen.update`, revalidates `/kitchen`.
- `src/app/api/kitchen/tickets/route.ts` — no-store JSON polling endpoint, gated by session + `kitchen.view`, outlet scoped.
- `/kitchen` split into server `page.tsx` + `KitchenClient.tsx`; initial render reads DB, client polls every 3s, bump/recall call the server action.
- `src/db/schema.ts` + `drizzle/0003_tearful_mesmero.sql` — actor columns for KDS milestones.
- `src/db/seed.ts` — Manager now receives `refund.request` and `kitchen.update`, reconciling the Phase 0 carry-over.
- Tests: `src/lib/kitchen-data.test.ts` covers outlet list scoping, station filter no-duplicate, valid transitions with actor/timestamps, invalid transition rejection, and cross-outlet mutation rejection.

## Definition of Done

PRD §24 gate met locally: service test green, full test suite green, typecheck/lint/build verified. Manual DB sync done via `npm run db:push` and `npm run db:seed`.

Carry-over: item-level checklist state remains local UI only because Phase 6 schema has no persisted per-item completion. Physical kitchen printer remains out of MVP per Phase 0.
