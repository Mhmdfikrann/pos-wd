# Landing Page & Customer App — Implementation Plan

**Source folder:** `docs/landing-page-dan-customer-app/`  
**Visual source of truth:**

- `Wanna Dimsum Landing.dc.html` — desktop landing.
- `Wanna Dimsum Landing Mobile.dc.html` — mobile landing.
- `Wanna Dimsum Customer App.dc.html` — mobile web loyalty app.

**Functional source of truth:** `PRD-Customer.md`.

## High-level decision summary

- Public/customer product is separate from internal POS RBAC. Do **not** reuse better-auth internal `users` table for customers.
- Public landing should become the customer-facing entry at `/`, with a visible staff/admin link to `/login` so internal POS remains accessible.
- Customer app should live under `/member` (Wanna Rewards) with customer-only email + password auth for MVP; no WA/OTP confirmation flow is active.
- Implementation must be visually faithful to the HTML mockups: colors, spacing, typography, card shapes, sticky CTA, phone-app feel, carousels/scroll behavior.
- Images in HTML are placeholders (`image-slot`). In Next.js, use repo-native placeholder components/slots first, then allow brand assets later.
- Local access after implementation: `localhost:3000/` opens Landing Page; POS staff enters via `localhost:3000/login`; Customer App starts at `localhost:3000/member`.

## Phase list

| Phase | Title | Depends on | Status |
|---|---|---|---|
| LCA-00 | Analysis, decisions, routing contract | — | complete |
| LCA-01 | Public landing desktop visual port | LCA-00 | complete |
| LCA-02 | Landing responsive/mobile parity | LCA-01 | complete |
| LCA-03 | Customer data model & email/password auth | LCA-00 | complete |
| LCA-04 | Customer app shell & home dashboard | LCA-03 | complete |
| LCA-05 | Rewards, vouchers, promo, history flows | LCA-04 | complete |
| LCA-06 | POS/customer linkage & owner reporting hooks | LCA-03, LCA-05 | complete |
| LCA-07 | UAT, polish, performance & release evidence | LCA-01..LCA-06 | done |

## Cross-cutting guardrails

- Read `AGENTS.md` and the relevant Next.js docs under `node_modules/next/dist/docs/` before coding.
- Keep POS internal auth/RBAC untouched except for routing changes explicitly scoped in LCA-00/LCA-01.
- Never mix customers into canonical internal `users`; create customer/member-specific tables.
- Preserve integer rupiah. Points should be integer.
- Prefer client screens and inline styles where needed for pixel fidelity, matching existing POS screen conventions.
