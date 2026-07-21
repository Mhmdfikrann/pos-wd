# Revisi 01 UAT Evidence — Wanna Dimsum POS

**Date:** 2026-07-21  
**Scope:** U01-01 through U01-05 (login password reveal, cashier identity, order context, simpan order, promo, EDC/transfer/split payment, Owner reporting/audit).  
**Environment:** local Next.js 16 app, SQLite via committed Drizzle migrations.

## Automated verification evidence

| Check | Result | Evidence |
|---|---:|---|
| TypeScript strict compile | PASS | `npm run typecheck` exited `0`. |
| ESLint | PASS | `npm run lint` exited `0`. |
| Full Vitest suite | PASS | `npm test` → 18 files / 138 tests passed. |
| Production build | PASS | `npm run build` exited `0`; App Router routes generated successfully. |

## UAT scenario checklist

| Scenario | Expected result | Evidence / implementation hook | Status |
|---|---|---|---:|
| Login password reveal | Password input toggles show/hide without clearing value; login flow remains better-auth. | `src/app/login/LoginForm.tsx` toggle with labels “Tampilkan password” / “Sembunyikan password”. | PASS |
| Cashier identity | Kasir shown from canonical session, not free text. | `/kasir` and open-shift chip render `session.name`; checkout/audit use `session.userId`. | PASS |
| Dine-in context | Nomor meja required; customer name optional; visible in cart/receipt/kitchen. | Server validation in `normalizeOrderContext`; kitchen `contextLabel`; receipt carries context fields. | PASS |
| Simpan Order / resume | Held order survives reload, resumes cart/context/promo, then pays same order. | `saveHeldOrder`, `listHeldOrders`, `heldOrderId` checkout; tests cover save/list/resume/pay. | PASS |
| Take away + promo + EDC BCA | Customer name required; promo calculated server-side; EDC provider/reference stored and shown in reports. | `discounts` promo lookup server-side; payment provider/channel label fields; Owner payment report labels provider. | PASS |
| GoFood + transfer | Delivery provider/name required; transfer account/reference stored; Owner report separates GoFood + transfer. | `orders.delivery_provider`, `channel_order_name`; `orderChannels`, `deliveryProviders`, `paymentMethods`. | PASS |
| Split cash + EDC Mandiri | Payment modal supports split lines; server rejects underpay; cash overpay change is correct. | `PaymentLineInput[]`, `normalizePaymentLines`; tests cover split, underpay, reference, idempotency. | PASS |
| Sales not double-counted | Split payment lines aggregate in payment report; sales gross/net count each order once. | `buildOwnerReport` uses `activeOrders` for sales and `paymentRows` only for payment breakdown; test asserts gross sales. | PASS |
| Kitchen exactly-once | Paid order creates one kitchen ticket; idempotency replay does not duplicate. | `kitchen_tickets_order_unq`; checkout tests include exactly-once + split replay. | PASS |
| Inventory exactly-once | Stock deduction occurs once per paid order, not on held order/replay. | `deductStockForOrderInTransaction`; tests cover replay and insufficient stock rollback. | PASS |
| Cash close | Cash close expected cash sums successful cash payment applied amounts; split non-cash does not inflate cash. | `computeExpectedCash`; cash-data tests pass. | PASS |
| Audit | Held/resume/paid/promo/split observability actions available. | Audit actions: `order.held`, `order.resumed`, `order.paid`, `promotion.applied`, `payment.split.accepted`. | PASS |

## Key report outputs now available

- **Sales by cashier:** canonical `orders.cashierId` joined to `users.name`.
- **Sales by order type/channel:** `orderChannels` includes Dine-in, Take away, Delivery GoFood/GrabFood/ShopeeFood.
- **Payment report:** line-based totals for Tunai, QRIS, E-Wallet, EDC BCA/Mandiri/BCA Lainnya/Mandiri Lainnya, Transfer Rekening BCA/Mandiri.
- **Promo/discount:** `promoDiscounts` aggregates promo snapshot names and manual/no-promo discounts.
- **Split payment:** payment report counts payment lines; gross/net sales stay order-based.

## Manual screenshot note

This evidence file records code/test/build verification. If client delivery requires visual artifacts, capture `/login`, `/kasir` payment modal, held-order modal, receipt modal, `/kitchen`, and Owner report pages in the browser after running migrations/seeds locally.
