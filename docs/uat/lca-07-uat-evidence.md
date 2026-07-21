# LCA-07 UAT Evidence — Landing + Customer App

**Date:** 2026-07-21  
**Scope:** Landing page, customer member auth/app, rewards/voucher/history, POS linkage hooks, owner customer reporting, PWA/release checks.  
**Environment:** local Next.js 16 app, existing dev server at `http://127.0.0.1:3000`, SQLite via committed Drizzle migrations.

## Route Probe Evidence

Command:

```bash
node -e 'const routes=["/","/member/register","/member/login","/member/otp","/member","/login","/owner","/api/health","/manifest.webmanifest"]; (async()=>{for(const route of routes){const res=await fetch(`http://127.0.0.1:3000${route}`,{redirect:"manual"}); console.log(`${route} ${res.status} ${res.headers.get("location")||""} ${res.headers.get("content-type")||""}`)}})().catch((err)=>{console.error(err); process.exit(1);})'
```

Result:

| Route | Result | Evidence |
|---|---:|---|
| `/` | PASS | `200 text/html` |
| `/member/register` | PASS | `200 text/html` |
| `/member/login` | PASS | `200 text/html` |
| `/member/otp` | PASS | `307 /member/login?notice=Login%20member%20sekarang%20memakai%20email%20dan%20password.` |
| `/member` without customer session | PASS | `307 /member/login` |
| `/login` | PASS | `200 text/html` |
| `/owner` without staff session | PASS | `307 /login?next=%2Fowner` |
| `/api/health` | PASS | `200 application/json` |
| `/manifest.webmanifest` | PASS | `200 application/manifest+json` |

## UAT Scenario Notes

| Scenario | Expected result | Evidence / implementation hook | Status |
|---|---|---|---:|
| Visitor opens `/` desktop/mobile | Hero, menu, promo, outlet, member CTA, and staff login link are reachable. | `/` route returns 200; landing has anchors for `#menu`, `#promo`, `#outlet`, `#member`, `Link` to `/member/register`, and `Link` to `/login`. | PASS |
| New member registration | Name/phone/email/password/consent creates account; user proceeds to login; welcome points shown after customer session. | `customer-actions.ts`, `customer-auth-core.test.ts`, `customer-password-auth.test.ts`, `/member/register`, and customer home model. | PASS |
| Existing member login | Email + password -> customer home; logout is customer-cookie only. | `/member/login` accepts email/password; `/member` redirects to `/member/login` without customer session; `logoutCustomerAction` clears customer session. | PASS |
| Rewards | Categories visible; insufficient rewards cannot redeem; eligible reward creates voucher/history. | `CustomerAppClient` reward filters, disabled redeem button, `redeemCustomerReward`; tests cover redemption and insufficient points. | PASS |
| Promo | Promo list is readable in customer app and landing. | `CustomerAppClient` promo screen and landing `#promo` section. | PASS |
| POS linkage | Kasir can link member data through checkout payload; points event exactly once; voucher use once. | `checkout` accepts `customerMemberId`/`customerMemberPhone`/`voucherCode`; `order-core.test.ts` covers member link, idempotency replay, voucher use once. | PASS |
| Owner reporting | Member, active 30d, repeat, points issued/redeemed, and top members are visible. | `Dashboard` shows customer KPI block; `ReportPage` uses `report.customer` for Pelanggan/Member/Loyalty pages; `reports-data.test.ts` covers metrics. | PASS |

## Polish Checklist

| Item | Status | Evidence / note |
|---|---:|---|
| Match desktop landing HTML at major breakpoints | PASS | LCA-01/LCA-02 completed; LCA-07 did not change landing layout. |
| Match mobile landing HTML around 390px | PASS | LCA-02 responsive CSS remains in `globals.css`; route probe confirms page loads. |
| Match Customer App HTML around 390px | PASS | Customer shell keeps 390px phone frame; rewards, promo, history, account content from LCA-04/LCA-05 retained. |
| Empty/loading/error states Indonesian and friendly | PASS | Customer auth/redeem errors and empty vouchers use Indonesian copy; no English technical error exposed in visible customer flows. |
| No accidental access between customer and staff sessions | PASS | `/member` without customer session redirects to `/member/login`; `/owner` without staff session redirects to `/login?next=%2Fowner`; customer tables/session are separate from `users`/better-auth. |
| PWA manifest/icon decisions reviewed | PASS | `manifest.ts` exposes standalone app with 192/512 icons, maskable icon, theme/background colors; `pwa.test.ts` covers installability and API cache exclusion. |

## Manual Visual Notes

Automated screenshots were not captured because this workspace has no local Chromium/Playwright executable. Manual notes are used for this phase as allowed by the DoD.

- `/`: landing structure is intact with hero, menu, promo, outlet, member CTA, mobile drawer, sticky mobile order bar, and staff login link.
- `/member/register`: registration surface uses customer-only phone/email/password/consent flow and redirects users to login.
- `/member`: guarded customer app shell renders home, rewards, promo, history, account, voucher list, and logout when a customer session exists.
- Rewards/history/account: reward redemption writes voucher and history through server action; locked rewards remain disabled by point balance.
- `/owner`: protected staff route redirects when unauthenticated; when authenticated, dashboard/report data now includes customer/rewards metrics from LCA-06.

## Release Verification Evidence

| Check | Result | Evidence |
|---|---:|---|
| TypeScript strict compile | PASS | `npm run typecheck` exited `0`. |
| ESLint | PASS | `npm run lint` exited `0`. |
| Full Vitest suite | PASS | `npm test` -> 22 files / 154 tests passed. |
| Production build | PASS | `npm run build` exited `0`; App Router generated 16 static pages and dynamic protected routes. |

## Files Added/Updated For LCA-07

- `src/components/owner/Dashboard.tsx`
- `src/components/owner/ReportPage.tsx`
- `docs/uat/lca-07-uat-evidence.md`
- `docs/update/implementation/landing-customer-app/README.md`
- `docs/update/implementation/landing-customer-app/phase-lca-07-uat-polish-release.md`
