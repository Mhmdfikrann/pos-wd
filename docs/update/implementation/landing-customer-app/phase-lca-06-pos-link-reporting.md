# LCA-06 — POS Linkage & Owner Reporting Hooks

**Status:** done — implemented 2026-07-21.  
**Depends on:** LCA-03, LCA-05.  
**Blocks:** LCA-07.

## Tujuan

Menyiapkan keterhubungan minimal antara Customer App dan POS internal sesuai PRD §8, tanpa membuat online ordering.

## Scope MVP

1. POS customer lookup/link
   - Kasir dapat memasukkan/mencari no. telepon member pada transaksi (atau fase ini hanya backend + seed jika UI terlalu besar).
   - Order menyimpan `customerMemberId`/phone snapshot bila member dipilih.
   - Poin earn dihitung dari paid order: contoh 1 poin per Rp1.000.

2. Voucher redemption at cashier
   - Kasir dapat memasukkan kode voucher customer.
   - Server validasi voucher aktif/belum dipakai/tidak expired.
   - Voucher dipakai menghasilkan discount server-side dan point/voucher event.

3. Owner reporting hooks
   - Member count.
   - Active members 30 days.
   - Repeat order basic.
   - Points issued/redeemed.
   - Top members (optional MVP).

## Non-scope

- Marketing campaign segmentation advanced.
- Push notification/SMS/email blast.
- Full CRM admin.

## Acceptance criteria

- [x] Paid order dapat menaut ke customer member valid.
- [x] Poin earn dibuat exactly once pada paid order/idempotency replay tidak menggandakan points.
- [x] Voucher redemption server-validated dan tidak bisa double-use.
- [x] Owner report punya data dasar member/points.
- [x] Outlet scope/internal auth tetap server-side.

## Verification

- Integration tests paid order linked to member → points event.
- Integration tests idempotency replay no double points.
- Integration tests voucher use once.

## Implementation notes

- POS linkage implemented in checkout core via `customerMemberId` / `customerMemberPhone`; orders persist `customer_member_id` and `customer_phone` snapshots.
- Earn rule is 1 point per Rp1.000 of paid total and runs in the same checkout transaction as order/payment/kitchen/stock.
- Voucher codes are server-validated against active, unused, unexpired customer vouchers; voucher reward names with `Rp...` determine the server-side discount amount for MVP.
- Owner reporting snapshot now exposes `customer` metrics: member count, active members 30d, repeat members, points issued/redeemed, and top members.

## Verified

- `npm test -- src/lib/order-core.test.ts src/lib/reports-data.test.ts`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
