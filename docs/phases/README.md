# Wanna Dimsum POS — Rencana Fase Implementasi

> Dokumen ini memecah `docs/PRD.md` (§23 Implementation Phases) menjadi file fase
> yang **self-contained**. Tujuannya: agent coding mengerjakan **satu file fase saja**
> tanpa harus membaca ulang seluruh PRD. Setiap file berisi scope, dependency,
> acceptance criteria, business rule yang relevan, dan Definition of Done lokal.
>
> **Sumber kebenaran visual:** empat mockup di `docs/*.dc.html`.
> **Sumber kebenaran fungsional:** `docs/PRD.md`.
> **Sumber kebenaran data:** `src/db/schema.ts`.

## Cara pakai (untuk agent)

1. Baca [`AGENTS.md`](../../AGENTS.md) di root (aturan Next.js 16 + konvensi proyek). **Wajib.**
2. Buka file fase yang ditugaskan di folder ini. Kerjakan hanya scope itu.
3. Jangan mulai fase sebelum semua `Bergantung pada` selesai (lihat graf di bawah).
4. Penuhi **Definition of Done** di akhir tiap file sebelum menandai selesai.

## Status audit awal (2026-07-19)

Audit paralel 9-agen atas kode + mockup + PRD. Ringkasan terverifikasi:

- **Frontend:** 4 mockup diport dengan fidelity tinggi (Kasir, Kitchen, Inventory, Owner suite). **100% mock-driven** — `src/db` belum diimport di mana pun di luar `db/`.
- **Backend:** schema Drizzle lengkap (24 tabel, encode BR-002/003/004/006/010). **Belum ada** service layer, server action, route handler, migration, atau seed.
- **Auth:** `better-auth` **sudah terpasang & dikonfigurasi** (`src/lib/auth.ts`, route `app/api/auth/[...all]`, tabel `session`/`account`/`verification`, seed 5 user per-role). Schema `users` dijadikan tabel kanonik (8 FK utuh), bukan bikin tabel `user` paralel. UI login/PIN/guard masih Fase 2.
- **Role:** 4 dari 5 role PRD punya route. **Manager Outlet (§6.2) belum ada route sama sekali** (blocker Fase 2).
- **Flow:** Open Shift (10.1), Close Shift (10.4), Refund (10.5) belum punya UI apa pun.

## Keputusan Fase 0 (default, dapat diubah)

| # | Pertanyaan (PRD §22) | Keputusan default |
|---|----------------------|-------------------|
| 1 | Pajak aktif di MVP? | **Ya**, PPN 11% (sesuai mockup Kasir & schema `outlets.taxPercent`). |
| 2 | Service charge aktif? | **Tidak** di MVP (`serviceChargePercent` default 0). |
| 3 | Dine-in butuh nomor meja? | **Opsional** (field ada, tidak wajib). |
| 4 | Split payment di MVP? | **Tidak** (Post-MVP §9). |
| 6 | Kasir boleh diskon manual? | **Tidak** tanpa approval Manager (konservatif). |
| 7 | Partial refund per item? | **Tidak** di MVP — refund granular Post-MVP; MVP refund per nominal + approval. |

Prinsip: **konservatif, ikut mockup.** Perubahan keputusan ini meng-update file fase terkait.

## Peta Fase → File

| Fase | File | Fokus | Bergantung pada |
|------|------|-------|-----------------|
| 0 | [phase-00-decisions.md](phase-00-decisions.md) | Keputusan, role matrix, katalog & resep awal | — |
| 1 | [phase-01-foundation.md](phase-01-foundation.md) | Env, koneksi DB, migration, seed, design system, test/CI | 0 |
| 2 | [phase-02-auth-outlet.md](phase-02-auth-outlet.md) | better-auth, login, PIN, RBAC, outlet isolation, role Manager | 1 |
| 3 | [phase-03-catalog.md](phase-03-catalog.md) | Category, product, variant, add-on, availability | 2 |
| 4 | [phase-04-shift-foundation.md](phase-04-shift-foundation.md) | Open shift, active shift, opening cash | 2 |
| 5 | [phase-05-pos-payment.md](phase-05-pos-payment.md) | Cart, order, checkout, receipt, idempotency | 3, 4 |
| 6 | [phase-06-kitchen.md](phase-06-kitchen.md) | Kitchen ticket, queue, status, timer | 5 |
| 7 | [phase-07-inventory.md](phase-07-inventory.md) | Inventory item, recipe, stock movement, auto-deduction | 3, 5 |
| 8 | [phase-08-cash-close-shift.md](phase-08-cash-close-shift.md) | Cash movement, expense, close shift, reconciliation | 4, 5 |
| 9 | [phase-09-refund-void-discount.md](phase-09-refund-void-discount.md) | Permission, approval, reversal, audit | 5, 8 |
| 10 | [phase-10-reports.md](phase-10-reports.md) | Sales, product, payment, shift, inventory reports | 5, 7, 8 |
| 11 | [phase-11-hardening-uat.md](phase-11-hardening-uat.md) | Security, performance, E2E, backup/restore, UAT | 2–10 |
| 12 | [phase-12-launch.md](phase-12-launch.md) | Deployment, training, SOP, go-live | 11 |

## Graf dependency

```
0 ─▶ 1 ─▶ 2 ─┬─▶ 3 ─┬─────────────▶ 5 ─┬─▶ 6
             │      │                   │
             └─▶ 4 ─┘                   ├─▶ 7 ─┐
                    │                   │      │
                    └───────▶ 8 ◀───────┘      │
                              │                │
                              └─▶ 9            │
                                   │           │
             10 ◀──────────────────┴───────────┘
             │
             ▼
            11 ─▶ 12
```

Jalur kritis: **0 → 1 → 2 → 3/4 → 5 → 8 → 9 → 10 → 11 → 12**.
Fase 6 (Kitchen) dan 7 (Inventory) dapat berjalan paralel setelah Fase 5.

## Business Rules (rujukan cepat, PRD §12)

| ID | Aturan | Ditegakkan di fase |
|----|--------|--------------------|
| BR-001 | Transaksi wajib outlet + shift + cashier + no. unik | 5 |
| BR-002 | Rupiah = integer, bukan float | 1, 5 |
| BR-003 | Payment wajib idempotency key | 5 |
| BR-004 | Order item simpan snapshot nama/SKU/variant/price/cost | 5 |
| BR-005 | Financial record tidak dihapus permanen | 5, 9 |
| BR-006 | Perubahan stok wajib lewat stock movement ledger | 7 |
| BR-007 | Checkout pakai DB transaction | 5 |
| BR-008 | Payment butuh shift open | 4, 5 |
| BR-009 | Refund ≤ paid amount yang belum direfund | 9 |
| BR-010 | Akses data dibatasi per outlet di server | 2 |
| BR-011 | Refund/void/diskon/cash adj/stock adj wajib diaudit | 9 |
| BR-012 | Master data soft delete / inactive | 3 |
| BR-013 | Stok dikurangi setelah payment berhasil | 7 |
| BR-014 | Negative stock tidak diizinkan di alur normal | 7 |
| BR-015 | Order dikirim ke dapur setelah payment berhasil | 6 |

## Definition of Done global (PRD §24)

Berlaku untuk **setiap** fase, selain DoD lokal masing-masing:

- Requirement & business rule terpenuhi · Authorization di server · Input tervalidasi
- Error handling ada · UI state lengkap (empty/loading/error/success)
- Migration tersedia bila perlu · Unit test ada · Integration test bila relevan
- E2E untuk critical flow · Lint lolos · Typecheck lolos · Build lolos
- Dokumentasi diperbarui · Verifikasi manual · Tidak ada critical bug
