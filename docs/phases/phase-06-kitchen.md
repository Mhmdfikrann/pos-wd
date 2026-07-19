# Phase 6 — Kitchen Display System

> Bagian dari rangkaian fase Wanna Dimsum POS. Baca **[AGENTS.md](../../AGENTS.md)** lebih dulu — konvensi, stack, dan aturan "This is NOT the Next.js you know" berlaku penuh. Indeks fase: **[README.md](./README.md)**.

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

- [ ] Pesanan hanya tampil pada outlet yang sesuai (BR-010).
- [ ] Setiap perubahan status punya actor + timestamp (`acceptedAt`, `readyAt`, `completedAt`).
- [ ] Invalid state transition ditolak server-side.
- [ ] Kitchen ticket tidak tampil ganda (idempotent creation dari Phase 5).

## Data model

`kitchenTickets` sudah lengkap: `status` enum, `station`, `acceptedAt/readyAt/completedAt`, `outletId` index.

## Server work

- `advanceTicket({ ticketId, toStatus })` — validasi transisi, set timestamp + actor.
- `listTickets({ outletId, station? })` — scoped query.
- Polling endpoint / server action revalidation.

## Definition of Done

Lihat PRD §24. Test: transisi invalid ditolak, no double-render, outlet scoping (cross-outlet test).
