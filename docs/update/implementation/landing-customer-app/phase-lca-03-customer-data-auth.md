# LCA-03 — Customer Data Model & Email/Password Auth

**Status:** complete (2026-07-21).  
**Depends on:** LCA-00.  
**Blocks:** LCA-04, LCA-05, LCA-06.

## Tujuan

Menyiapkan fondasi data dan auth demo untuk Customer App tanpa mencampur customer dengan user internal POS.

## Scope

1. Schema/migration
   - `customer_members` dengan phone unique, name, email, consent fields, pointsBalance, tier.
   - `customer_point_events` untuk bonus/earn/redeem/adjust.
   - `customer_rewards` dan `customer_vouchers` bila LCA-05 ingin langsung pakai DB.
   - `password_hash` pada `customer_members` untuk credential customer.
   - Optional/legacy `customer_otp_attempts` tidak dipakai flow aktif.

2. Auth/server actions
   - Register: fullName, phone, email, password, terms/privacy consent.
   - Setelah register, customer diarahkan ke `/member/login`.
   - Login: email + password; tidak ada konfirmasi WA/OTP aktif.
   - Customer session cookie separate dari better-auth internal cookie.

3. Seed
   - Member demo.
   - Reward catalog demo.
   - Promo demo.
   - Point history demo.

## Non-scope

- WA/SMS/OTP provider real.
- Full privacy/legal pages beyond links/placeholders.

## Acceptance criteria

- [x] Migration customer tables tersedia.
- [x] Internal `users` table tidak berubah untuk customer.
- [x] Register customer membuat member + welcome points event.
- [x] Login email/password membuat customer session.
- [x] Logout customer menghapus customer session, bukan staff session.
- [x] Error messages jelas dan berbahasa Indonesia.

## Verification

- Unit/integration tests for register/login/session helpers.
- Manual register → `/member/login`.
- Manual login existing email/password → `/member`.

## Implementation notes

- Menambahkan migration `drizzle/0009_cold_sleeper.sql` untuk tabel customer/member: `customer_members`, `customer_otp_attempts`, `customer_point_events`, `customer_rewards`, `customer_vouchers`, dan `customer_promos`.
- Menambahkan migration `drizzle/0011_customer_email_password.sql` untuk `customer_members.password_hash` dan unique email login.
- Customer/member tetap terpisah dari internal POS `users`; tidak ada perubahan struktur untuk better-auth staff user.
- Register member memakai server action `registerCustomerAction`: validasi data + consent + password, insert member, welcome bonus 250 poin, lalu redirect ke `/member/login`.
- Login member memakai `startCustomerLoginAction`: validasi email/password, verify hash, lalu membuat cookie `wd_customer_session`.
- Tidak ada flow konfirmasi WA/OTP aktif; `/member/otp` hanya compatibility redirect ke login.
- Customer session helper berada di `src/lib/customer-session.ts`; cookie customer terpisah dari better-auth staff cookie. Logout customer hanya menghapus cookie customer.
- UI MVP untuk `/member/register`, `/member/login`, dan guarded placeholder `/member` sudah tersedia untuk manual flow sampai LCA-04.
- Seed menambahkan member demo, rewards, voucher, promo, dan point history demo. Local DB sudah diterapkan migration customer secara manual karena `drizzle-kit push` gagal pada drift index lama (`orders_order_no_unique already exists`), lalu `npm run db:seed` berhasil.

## Verification result

- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm test` ✅ (19 files / 144 tests)
- `npm run build` ✅
- `npm run db:seed` ✅

**Status: complete (2026-07-21).**
