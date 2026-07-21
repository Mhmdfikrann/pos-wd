# LCA-07 — UAT, Polish, Performance & Release Evidence

**Status:** done — implemented 2026-07-21.  
**Depends on:** LCA-01, LCA-02, LCA-03, LCA-04, LCA-05, LCA-06.  
**Blocks:** release Landing + Customer App.

## Tujuan

Memastikan landing, customer app, POS linkage, reports, dan visual fidelity siap diserahkan untuk review owner/brand.

## UAT scenarios

1. Visitor opens `/` desktop and mobile.
   - Hero, menu, promo, outlet, member CTA visible.
   - CTA register works.
   - Staff login link works.

2. New member registration.
   - Fill name/phone/email/password/consent.
   - After account creation, user is directed to login.
   - Email/password login reaches home and welcome points are shown.

3. Existing member login.
   - Email + password → home.
   - Logout works.

4. Rewards.
   - View categories.
   - Locked insufficient reward cannot redeem.
   - Redeem eligible reward creates voucher and history row.

5. Promo.
   - Promo list visible and readable.

6. POS linkage.
   - Kasir links phone/member to paid order.
   - Points event created once.
   - Voucher redemption works once.

7. Owner reporting.
   - Member/points/repeat metrics visible if implemented in LCA-06.

## Polish checklist

- [x] Match desktop landing HTML at major breakpoints.
- [x] Match mobile landing HTML around 390px.
- [x] Match Customer App HTML around 390px.
- [x] Empty/loading/error states Indonesian and friendly.
- [x] No accidental access between customer session and staff session.
- [x] PWA manifest/icon decisions reviewed.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- Manual screenshots/evidence under `docs/uat/`.

## Definition of Done

- [x] UAT evidence doc created.
- [x] Screenshots or manual notes for `/`, `/member/register`, `/member`, rewards, history, account.
- [x] Migration/seed included.
- [x] No regression to internal POS login and protected role routes.

## Implementation notes

- UAT evidence created at `docs/uat/lca-07-uat-evidence.md`.
- Owner dashboard/report surfaces now show LCA-06 customer metrics: active members, repeat members, points issued/redeemed, and top members.
- Phase index synced so LCA-06 and LCA-07 are no longer marked planned.
- Manual notes were used instead of screenshots because this workspace has no local browser screenshot engine; route probes and full release verification were recorded.

## Verified

- Local route probe for `/`, `/member/register`, `/member/login`, `/member/otp` compatibility redirect, `/member`, `/login`, `/owner`, `/api/health`, `/manifest.webmanifest`.
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
