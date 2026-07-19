# Phase 9 — Refund, Void & Discount

> Bagian dari rangkaian fase Wanna Dimsum POS. Baca **[AGENTS.md](../../AGENTS.md)** lebih dulu — konvensi, stack, dan aturan "This is NOT the Next.js you know" berlaku penuh. Indeks fase: **[README.md](./README.md)**.

**PRD refs:** §8.10, Flow 10.5 (Refund), FR-014, BR-009, BR-011, §6.2 (Manager approval).
**Depends on:** [Phase 5](./phase-05-pos-payment.md), [Phase 8](./phase-08-cash-close-shift.md), [Phase 2](./phase-02-auth-outlet.md) (Manager role + RBAC).
**Blocks:** [Phase 10](./phase-10-reports.md) (refund/void/discount reports).

---

## Tujuan

Refund, void, dan diskon manual dengan permission, approval Manager, reversal, dan audit penuh. Sekaligus melahirkan **surface Manager** yang hilang total (gap blocker).

## Gap terverifikasi

- **Blocker** — Flow 10.5 Refund tidak punya UI: tidak ada transaction picker, item/amount selection, reason entry, atau approval flow. Tabel `refunds` + `approvedById` ada tapi tak terpakai.
- **Blocker** — Role Manager (§6.2) tidak punya route/landing. Manager hanya muncul sebagai data contoh + toggle "Wajib persetujuan manager". Fase ini membangun **approvals inbox** Manager.
- **Medium** — tidak ada transaction-history screen; refund step 1 ("pilih transaksi") mengandaikan daftar transaksi yang bisa di-browse. `Daftar Pesanan` hanya label nav Owner via archetype generik.

## Scope

- Standalone **order-list / transaction-history** screen untuk Kasir/Manager.
- Refund: pilih transaksi → pilih item/nominal → reason → approval Manager → catat.
- Void order.
- Diskon manual (default Phase 0 konservatif: kasir **tidak** boleh diskon manual tanpa approval — final = open question §22.6).
- **Manager approvals inbox**: refund/void/discount/stock-adjustment/cash-adjustment requests.

## Core flow — Refund (PRD 10.5)

1. Pilih transaksi.
2. Pilih item atau nominal refund.
3. Isi alasan.
4. Manager approval.
5. Sistem catat refund.
6. Laporan diperbarui.
7. Stok dikembalikan hanya bila aturan memungkinkan.

## Acceptance criteria

- [ ] Refund **tidak melebihi** paid amount yang belum direfund (BR-009).
- [ ] Refund punya actor, reason, approval.
- [ ] Histori transaksi asli tetap tersedia (financial record tidak dihapus permanen — BR-005).
- [ ] Refund, void, diskon manual masuk audit log (BR-011).
- [ ] Refund/void/discount hanya oleh role dengan permission (server-side, FR-002).

## Server work

- `requestRefund` / `approveRefund({ refundId, approverId })` — cek belum-melebihi, transaksi DB, audit.
- `voidOrder` — reversal, audit.
- `applyManualDiscount` — permission gate, audit.
- Approval queue query untuk Manager (scoped outlet).

## Definition of Done

Lihat PRD §24. Test: refund > paid ditolak, refund tanpa approval ditolak, void reversal konsisten, semua tindakan sensitif ada di audit log. IDOR test lintas-outlet untuk approval.
