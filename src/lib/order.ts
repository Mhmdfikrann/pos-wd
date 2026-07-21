/**
 * Order + checkout data-access layer (Phase 5) — server-only wrapper.
 *
 * The integrity-critical logic lives in `order-core.ts` (db-parameterized, so it
 * can be tested against an in-memory SQLite). This module binds the real
 * singleton `db` and re-exports the types, keeping the enforcement point + the
 * "checkout is one synchronous transaction" invariant in one place.
 *
 * Server-only — never import from a client component.
 */
import "server-only";
import { db } from "@/db";
import {
  checkout as checkoutCore,
  saveHeldOrder as saveHeldOrderCore,
  listHeldOrders as listHeldOrdersCore,
  buildReceipt as buildReceiptCore,
  type CheckoutInput,
  type HeldOrderInput,
  type HeldOrderView,
  type Receipt,
} from "@/lib/order-core";

export type {
  OrderType,
  DeliveryProvider,
  PaymentMethod,
  PaymentLineInput,
  CartLine,
  CheckoutInput,
  HeldOrderInput,
  HeldOrderView,
  Receipt,
  ReceiptLine,
} from "@/lib/order-core";

/** Execute a checkout against the app DB (atomic, idempotent). */
export function checkout(input: CheckoutInput): Receipt {
  return checkoutCore(db, input);
}

/** Create or update a held order without payment/kitchen/stock side effects. */
export function saveHeldOrder(input: HeldOrderInput): HeldOrderView {
  return saveHeldOrderCore(db, input);
}

/** List held orders for one already-scoped outlet. */
export function listHeldOrders(outletId: string): HeldOrderView[] {
  return listHeldOrdersCore(db, outletId);
}

/** Assemble receipt data for an order (reprint, FR-007). */
export function buildReceipt(orderId: string): Receipt {
  return buildReceiptCore(db, orderId);
}
