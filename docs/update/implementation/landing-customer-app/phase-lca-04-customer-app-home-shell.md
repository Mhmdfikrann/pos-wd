# LCA-04 — Customer App Shell & Home Dashboard

**Status:** complete (2026-07-21).  
**Depends on:** LCA-03.  
**Blocks:** LCA-05, LCA-07.

## Tujuan

Membuat Customer App mobile-first yang mirip `Wanna Dimsum Customer App.dc.html`, dimulai dari shell dan beranda member.

## Scope

1. Routes/shell
   - `/member` guarded by customer session.
   - Public redirects to `/member/login` if not logged in.
   - Mobile app feel: phone/web-app shell, top greeting, bottom nav/tab state.

2. Auth screens
   - `/member/register` form: name, phone, email, password, consent checkbox.
   - `/member/login` email + password form.
   - `/member/otp` only redirects to `/member/login` as legacy compatibility.

3. Home dashboard
   - Member card: points balance, tier, progress to next tier.
   - Quick actions: Tukar Poin, Promo, Riwayat, Outlet.
   - Visit/spend stats.
   - Promo carousel preview.
   - Reward preview cards.

## Non-scope

- Full redemption mechanics (LCA-05).
- POS earn-points integration (LCA-06).

## Acceptance criteria

- [x] Customer app home visually follows HTML customer app.
- [x] Logged out customers cannot access `/member` home.
- [x] Register then login email/password flow reaches home.
- [x] Member points/tier/progress pulled from DB/demo data.
- [x] Mobile layout is primary and usable on 390px.

## Verification

- Manual register/login/home.
- `npm run typecheck`, `npm run lint`, tests where applicable.

## Implementation notes

- `/member` is guarded by `requireCustomerSession()` and redirects anonymous customers to `/member/login`.
- `/member/register` and `/member/login` use the LCA-03 server actions and customer-only session cookie; internal staff `users`/better-auth sessions remain separate.
- `/member/otp` is retained only as a compatibility redirect to email/password login.
- Home dashboard data is shaped through `src/lib/customer-home.ts` from DB/demo rows: member points, tier progress, visit/spend summary, promo preview, reward preview, and point history.
- The mobile shell uses a 390px phone frame on desktop and expands to full viewport under 430px via existing CSS.

## Verification result

- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm test` ✅ (21 files / 149 tests)
- `npm run build` ✅
- HTTP smoke on existing dev server `http://localhost:3000`:
  - `/member` anonymous: `307` → `/member/login`
  - `/member/login`: `200`
  - `/member/register`: `200`
  - `/member/otp`: redirects to `/member/login`
