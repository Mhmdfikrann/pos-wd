# LCA-05 — Rewards, Vouchers, Promo & History Flows

**Status:** complete (2026-07-21).  
**Depends on:** LCA-04.  
**Blocks:** LCA-06, LCA-07.

## Tujuan

Mengimplementasikan fitur loyalty utama: reward catalog, redemption demo, voucher saya, promo, dan riwayat poin.

## Scope

1. Rewards
   - Katalog reward kategori: Voucher, Paket, Gratis, Ongkir.
   - Filter kategori.
   - Locked state bila poin tidak cukup.
   - Bottom sheet konfirmasi tukar poin.
   - Redemption membuat voucher berlaku 30 hari dan point event `redeem`.

2. Promo
   - Daftar promo aktif customer-facing.
   - Detail sederhana: ikon, judul, deskripsi, periode.
   - Promo informative; klaim di kasir/outlet.

3. History
   - List earn/redeem/bonus events.
   - Summary poin masuk vs keluar.
   - Row: transaksi/outlet/tanggal/jumlah poin.

4. Account
   - Profil member.
   - Voucher saya.
   - Notifikasi/help/logout.

## Non-scope

- Real online ordering.
- Referral.
- Complex campaign engine.

## Acceptance criteria

- [x] Member bisa melihat reward catalog dan filter kategori.
- [x] Reward dengan poin tidak cukup terkunci.
- [x] Reward cukup poin bisa diredeem, saldo turun, voucher dibuat.
- [x] Promo aktif tampil.
- [x] History menampilkan bonus welcome dan redemption.
- [x] Account menampilkan profile + voucher saya + logout.

## Verification

- Integration tests for redemption balance/voucher/event.
- Manual home → rewards → redeem → voucher/history.

## Implementation notes

- Reward redemption lives in `src/lib/customer-redemption.ts` as a DB-parameterized transaction: validate member, validate active reward, reject insufficient points, deduct balance, create active voucher, and insert `customer_point_events.kind = "redeem"`.
- `redeemRewardAction` in `src/lib/customer-actions.ts` revalidates `/member` after a successful redemption and keeps authorization server-side through `requireCustomerSession()`.
- `/member` now loads member vouchers with reward labels, point history summary, active promos, and active rewards, then passes minimal DTOs into the client shell.
- Rewards tab adds category filters (`Semua`, `Voucher`, `Paket`, `Gratis`, `Ongkir`), locked states, and a keyboard-accessible bottom sheet confirmation.
- Promo, Riwayat, and Akun tabs now render full LCA-05 content: promo cards, earned/redeemed summary, point rows, profile, voucher saya, notification/help affordances, and logout.

## Verification result

- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm test` ✅ (22 files / 152 tests)
- `npm run build` ✅
- HTTP smoke on existing dev server `http://localhost:3000`:
  - `/member` anonymous: `307` → `/member/login`
  - `/member/login`: `200`
  - `/member/register`: `200`
