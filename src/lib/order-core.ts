/**
 * Order + checkout core logic (Phase 5, PRD §8.4/§8.5/§10.2).
 *
 * The most integrity-critical code in the app. Extracted from `order.ts` as a
 * `db`-parameterized module so it can run against an in-memory SQLite in tests
 * without pulling in `server-only` / the singleton connection. `order.ts` is the
 * thin server-only wrapper that binds the real `db`.
 *
 * Rules enforced here:
 *  - Prices come from the DB, never the client (server is authoritative).
 *  - Totals via `order-math.ts` (integer rupiah, BR-002).
 *  - Checkout is ONE synchronous better-sqlite3 transaction (BR-007): order +
 *    items + payment + kitchen ticket commit together or not at all.
 *  - Idempotency (BR-003): a repeated `idempotencyKey` replays the existing
 *    receipt instead of charging twice — pre-checked, and backstopped by the
 *    unique index on `payments.idempotency_key` if two requests race.
 *  - Exactly-once kitchen ticket (BR): unique index on `kitchen_tickets.order_id`.
 *  - Payment requires an OPEN shift (BR-008), re-verified inside the transaction.
 *
 * NOTE: drizzle's better-sqlite3 `db.transaction(cb)` callback is SYNCHRONOUS —
 * every query inside uses `.run()/.get()/.all()` with no `await`. Do not make the
 * callback async; that silently breaks atomicity.
 *
 * Stock deduction (Phase 7) inserts `sale_deduction` movements inside this same
 * transaction, so payment and inventory either commit together or roll back
 * together.
 */
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
  orders,
  orderItems,
  payments,
  kitchenTickets,
  products,
  shifts,
} from "@/db/schema";
import { deductStockForOrderInTransaction } from "@/lib/inventory-data";
import { computeTotals, computeChange, type OrderLine } from "@/lib/order-math";

/**
 * The db surface checkout needs. Generic over the schema so both the real
 * singleton `db` (typed with the full schema) and a bare test db (`drizzle()`
 * with no schema) satisfy it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CheckoutDb = BetterSQLite3Database<any>;

export type OrderType = "dinein" | "takeaway" | "delivery";
export type PaymentMethod = "cash" | "qris" | "transfer" | "ewallet";

/** A cart line from the client: a product id + quantity + optional note. */
export interface CartLine {
  productId: string;
  quantity: number;
  note?: string | null;
}

export interface CheckoutInput {
  outletId: string;
  shiftId: string;
  cashierId: string;
  cart: CartLine[];
  orderType: OrderType;
  tableNo?: string | null;
  guestCount?: number | null;
  orderNote?: string | null;
  taxPercent: number;
  discountAmount?: number;
  payment: {
    method: PaymentMethod;
    /** cash tendered (cash only); non-cash pass total */
    cashReceived: number;
    referenceNo?: string | null;
  };
  /** BR-003 — dedupes double-submit. */
  idempotencyKey: string;
}

export interface ReceiptLine {
  name: string;
  sku: string | null;
  variant: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Receipt {
  orderId: string;
  orderNo: string;
  outletId: string;
  createdAt: string;
  orderType: OrderType;
  tableNo: string | null;
  lines: ReceiptLine[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  payment: {
    method: PaymentMethod;
    amount: number;
    cashReceived: number | null;
    changeAmount: number | null;
  };
  /** true when this receipt was replayed from a prior identical request. */
  replayed: boolean;
}

/** Human-readable, unique order number (BR-001). */
function makeOrderNo(): string {
  // TRX-<base36 time>-<random> — the unique index is the real guard.
  const rand = randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  return `TRX-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

/**
 * Execute a checkout. Atomic: order + items + payment + kitchen ticket in one
 * transaction, or nothing. Idempotent on `idempotencyKey`.
 *
 * Throws (caller maps to a friendly message) on: empty cart, unknown/inactive
 * product, no open shift, or cash < total. A thrown error inside the transaction
 * rolls the whole thing back (BR-007).
 */
export function checkout(db: CheckoutDb, input: CheckoutInput): Receipt {
  if (input.cart.length === 0) {
    throw new Error("Keranjang kosong.");
  }

  // Idempotency replay: if this key already paid, return that receipt untouched.
  const prior = db
    .select({ orderId: payments.orderId })
    .from(payments)
    .where(eq(payments.idempotencyKey, input.idempotencyKey))
    .get();
  if (prior) {
    return { ...buildReceipt(db, prior.orderId), replayed: true };
  }

  const orderId = randomUUID();
  const orderNo = makeOrderNo();

  db.transaction((tx) => {
    // Re-verify the shift is open (BR-008) inside the tx — never trust the caller.
    const shift = tx
      .select({ id: shifts.id, status: shifts.status, outletId: shifts.outletId })
      .from(shifts)
      .where(eq(shifts.id, input.shiftId))
      .get();
    if (!shift || shift.status !== "open") {
      throw new Error("Tidak ada shift terbuka.");
    }
    if (shift.outletId !== input.outletId) {
      throw new Error("Shift bukan milik outlet ini.");
    }

    // Build order lines from DB prices — client prices are never trusted.
    const lines: OrderLine[] = input.cart.map((c) => {
      const p = tx
        .select()
        .from(products)
        .where(and(eq(products.id, c.productId), eq(products.active, true)))
        .get();
      if (!p) throw new Error(`Produk tidak ditemukan: ${c.productId}`);
      if (!p.available) throw new Error(`Produk tidak tersedia: ${p.name}`);
      return {
        productId: p.id,
        nameSnapshot: p.name,
        skuSnapshot: p.sku,
        variantSnapshot: null,
        unitPrice: p.price,
        costSnapshot: p.costPrice,
        quantity: c.quantity,
        note: c.note ?? null,
      };
    });

    const totals = computeTotals(lines, input.taxPercent, input.discountAmount ?? 0);

    // Cash validation + change (BR-015). Non-cash: cashReceived must equal total.
    const isCash = input.payment.method === "cash";
    const cashReceived = isCash ? input.payment.cashReceived : totals.total;
    const changeAmount = computeChange(totals.total, cashReceived);

    tx.insert(orders).values({
      id: orderId,
      orderNo,
      outletId: input.outletId,
      shiftId: input.shiftId,
      cashierId: input.cashierId,
      orderType: input.orderType,
      tableNo: input.tableNo ?? null,
      guestCount: input.guestCount ?? null,
      status: "paid",
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      discountAmount: totals.discountAmount,
      total: totals.total,
      note: input.orderNote ?? null,
    }).run();

    for (const l of lines) {
      tx.insert(orderItems).values({
        id: randomUUID(),
        orderId,
        productId: l.productId,
        nameSnapshot: l.nameSnapshot,
        skuSnapshot: l.skuSnapshot,
        variantSnapshot: l.variantSnapshot,
        priceSnapshot: l.unitPrice,
        costSnapshot: l.costSnapshot,
        quantity: l.quantity,
        note: l.note,
      }).run();
    }

    // Payment — unique idempotencyKey is the hard double-charge guard (BR-003).
    tx.insert(payments).values({
      id: randomUUID(),
      orderId,
      idempotencyKey: input.idempotencyKey,
      method: input.payment.method,
      amount: totals.total,
      cashReceived: isCash ? cashReceived : null,
      changeAmount: isCash ? changeAmount : null,
      referenceNo: input.payment.referenceNo ?? null,
      status: "success",
    }).run();

    // Exactly-once kitchen ticket — unique index on order_id is the guard (BR).
    // One ticket per order; per-station routing is Phase 6's concern.
    tx.insert(kitchenTickets).values({
      id: randomUUID(),
      orderId,
      outletId: input.outletId,
      station: null,
      status: "new",
    }).run();

    // Recipe-based stock deduction (Phase 7). Products without recipes are
    // skipped; products with recipes must have enough outlet stock.
    deductStockForOrderInTransaction(tx as CheckoutDb, { orderId, actorId: input.cashierId });
  });

  return buildReceipt(db, orderId);
}

/** Assemble receipt data for an order (used by checkout + reprint, FR-007). */
export function buildReceipt(db: CheckoutDb, orderId: string): Receipt {
  const order = db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) throw new Error("Order tidak ditemukan.");

  const items = db.select().from(orderItems).where(eq(orderItems.orderId, orderId)).all();
  const pay = db.select().from(payments).where(eq(payments.orderId, orderId)).get();

  return {
    orderId: order.id,
    orderNo: order.orderNo,
    outletId: order.outletId,
    createdAt: order.createdAt,
    orderType: order.orderType,
    tableNo: order.tableNo,
    lines: items.map((it) => ({
      name: it.nameSnapshot,
      sku: it.skuSnapshot,
      variant: it.variantSnapshot,
      unitPrice: it.priceSnapshot,
      quantity: it.quantity,
      lineTotal: it.priceSnapshot * it.quantity,
    })),
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    taxAmount: order.taxAmount,
    total: order.total,
    payment: pay
      ? {
          method: pay.method,
          amount: pay.amount,
          cashReceived: pay.cashReceived,
          changeAmount: pay.changeAmount,
        }
      : { method: "cash", amount: order.total, cashReceived: null, changeAmount: null },
    replayed: false,
  };
}
