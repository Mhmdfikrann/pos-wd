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
  buildReceipt as buildReceiptCore,
  type CheckoutInput,
  type Receipt,
} from "@/lib/order-core";

export type {
  OrderType,
  PaymentMethod,
  CartLine,
  CheckoutInput,
  Receipt,
  ReceiptLine,
} from "@/lib/order-core";

/** Execute a checkout against the app DB (atomic, idempotent). */
export function checkout(input: CheckoutInput): Receipt {
  return checkoutCore(db, input);
}

/** Assemble receipt data for an order (reprint, FR-007). */
export function buildReceipt(orderId: string): Receipt {
  return buildReceiptCore(db, orderId);
}
