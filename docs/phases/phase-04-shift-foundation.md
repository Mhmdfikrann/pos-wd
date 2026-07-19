# Phase 4 — Shift Foundation

> **Status:** complete (2026-07-19) · Bagian dari rangkaian fase Wanna Dimsum POS. Baca **[AGENTS.md](../../AGENTS.md)** lebih dulu — konvensi, stack, dan aturan "This is NOT the Next.js you know" berlaku penuh. Indeks fase: **[README.md](./README.md)**.

**PRD refs:** §8.7 (Shift & Cash), §10.1 (Open Shift), FR-009, BR-008.
**Depends on:** [Phase 2](./phase-02-auth-outlet.md) (butuh user + outlet scope).
**Blocks:** [Phase 5](./phase-05-pos-payment.md) (payment digate oleh shift open).

---

## Tujuan

Membangun siklus **buka shift** dan konsep **shift aktif** — fondasi yang menggate semua transaksi. Ini bagian pertama dari lifecycle shift; penutupan + rekonsiliasi ada di [Phase 8](./phase-08-cash-close-shift.md).

## Scope

- Open shift: pilih outlet (dari outlet yang di-assign ke user), input `openingCash`.
- Satu shift aktif per (outlet, kasir) — invariant keras.
- Konsep "shift aktif" yang bisa dibaca server saat checkout.
- UI: modal / layar buka shift di `/kasir`. Saat ini `/kasir` hanya menampilkan badge statis `Shift · 4j 12m` (kasir/page.tsx:285) — badge itu harus jadi state nyata dari shift terbuka.

## Acceptance criteria (PRD §10.1)

- [x] Kasir hanya punya **satu shift aktif per (outlet, kasir)** (enforced server-side). *Tiga lapis: `assertNoActiveShift` (shift-rules), cek `getActiveShift` (service), dan partial unique index `shifts_one_open_unq ON (outlet_id, cashier_id) WHERE status='open'` (backstop). Diverifikasi runtime: buka ke-2 ditolak `UNIQUE constraint failed`; setelah shift ditutup, buka lagi berhasil (index partial, bukan blanket).*
- [x] Pembayaran **ditolak** jika tidak ada shift aktif (BR-008). *POS digate: `getActiveShiftForCashier` menentukan apakah `/kasir` menampilkan katalog atau layar buka-shift. Enforcement di sisi checkout diverifikasi penuh di Phase 5.*
- [x] `openingCash` **tidak boleh negatif**. *`cleanOpeningCash` (shift-rules) — integer rupiah ≥ 0, dipanggil di action dan service; unit-tested.*
- [x] Aktivitas open shift dicatat ke `auditLogs`. *`actionOpenShift` menulis `writeAudit({ action: "shift.open", actorId, outletId, entityId, detail:{openingCash} })`.*

## What shipped this phase

- **DB invariant:** partial unique index `shifts_one_open_unq ON (outlet_id, cashier_id) WHERE status = 'open'` (`src/db/schema.ts`), migration `drizzle/0001_last_matthew_murdock.sql`, pushed to dev DB. Closed shifts don't block re-opening — verified at runtime.
- `src/lib/shift-rules.ts` — pure rules (`cleanOpeningCash`, `assertNoActiveShift`, `formatShiftDuration`), unit-tested (`shift-rules.test.ts`, 10 tests).
- `src/lib/shift.ts` — data-access layer (`getActiveShift`, `getActiveShiftForCashier`, `openShift`); server-only, auth-free.
- `src/lib/shift-actions.ts` — `"use server"` `actionOpenShift`/`actionGetActiveShift`: gated on `shift.open`, outlet scope (BR-010), opening-cash validation, `shift.open` audit event, `revalidatePath("/kasir")`.
- `src/lib/outlets.ts` — `listOutlets` (id→name for the picker).
- `src/lib/audit.ts` — added `shift.open` (+`shift.close` for Phase 8) to `AuditAction`.
- `src/app/kasir/OpenShiftScreen.tsx` — the gate: outlet picker + opening-cash entry, shown when no active shift.
- `src/app/kasir/page.tsx` — now resolves session + active shift; renders the gate or the POS scoped to the open shift's outlet.
- `src/app/kasir/KasirClient.tsx` — real `outletName`/`cashierName` from the session; the static `Shift · 4j 12m` badge is now live from `openedAt`.

## Definition of Done

PRD §24 gate: typecheck + lint + build + tests (52) green. Server authz + validation in place; one-active-shift invariant unit-tested *and* verified at the DB layer (open → duplicate rejected → close → re-open succeeds); open-shift audited. Full "payment rejected without active shift" enforcement is Phase 5 (checkout), but the POS is already gated behind an open shift here.
