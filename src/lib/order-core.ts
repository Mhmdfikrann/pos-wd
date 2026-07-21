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
import { and, desc, eq, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
  orders,
  orderItems,
  payments,
  kitchenTickets,
  products,
  shifts,
  discounts,
  customerMembers,
  customerPointEvents,
  customerRewards,
  customerVouchers,
} from "@/db/schema";
import { deductStockForOrderInTransaction } from "@/lib/inventory-data";
import { computeTotals, type OrderLine } from "@/lib/order-math";
import { normalizeCustomerPhone } from "@/lib/customer-auth-core";

/**
 * The db surface checkout needs. Generic over the schema so both the real
 * singleton `db` (typed with the full schema) and a bare test db (`drizzle()`
 * with no schema) satisfy it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CheckoutDb = BetterSQLite3Database<any>;

export type OrderType = "dinein" | "takeaway" | "delivery";
export type DeliveryProvider = "gofood" | "grabfood" | "shopeefood";
export type PaymentMethod = "cash" | "qris" | "transfer" | "ewallet" | "card";

/** A cart line from the client: a product id + quantity + optional note. */
export interface CartLine {
  productId: string;
  quantity: number;
  note?: string | null;
}

export interface PaymentLineInput {
  method: PaymentMethod;
  amount: number;
  /** cash tendered (cash only); defaults to amount */
  cashReceived?: number | null;
  provider?: string | null;
  channelLabel?: string | null;
  referenceNo?: string | null;
}

export interface CheckoutInput {
  outletId: string;
  heldOrderId?: string | null;
  shiftId: string;
  cashierId: string;
  cart: CartLine[];
  orderType: OrderType;
  tableNo?: string | null;
  customerName?: string | null;
  deliveryProvider?: DeliveryProvider | null;
  channelOrderName?: string | null;
  guestCount?: number | null;
  orderNote?: string | null;
  taxPercent: number;
  promoId?: string | null;
  discountAmount?: number;
  customerMemberId?: string | null;
  customerMemberPhone?: string | null;
  voucherCode?: string | null;
  /** Legacy single-payment shape; normalized to `payments`. */
  payment?: {
    method: PaymentMethod;
    /** cash tendered (cash only); non-cash pass total */
    cashReceived: number;
    referenceNo?: string | null;
  };
  payments?: PaymentLineInput[];
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

export interface ReceiptPaymentLine {
  method: PaymentMethod;
  provider: string | null;
  channelLabel: string | null;
  amount: number;
  cashReceived: number | null;
  changeAmount: number | null;
  referenceNo: string | null;
}

export interface Receipt {
  orderId: string;
  orderNo: string;
  outletId: string;
  createdAt: string;
  orderType: OrderType;
  tableNo: string | null;
  customerName: string | null;
  deliveryProvider: DeliveryProvider | null;
  channelOrderName: string | null;
  customerMemberId: string | null;
  customerPhone: string | null;
  lines: ReceiptLine[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  promoId: string | null;
  promoName: string | null;
  pointsEarned: number;
  voucherCode: string | null;
  payment: ReceiptPaymentLine;
  payments: ReceiptPaymentLine[];
  /** true when this receipt was replayed from a prior identical request. */
  replayed: boolean;
}

export interface PromoSnapshot {
  id: string;
  name: string;
  type: "percent" | "amount";
  value: number;
  discountAmount: number;
}

export interface HeldOrderInput {
  orderId?: string | null;
  outletId: string;
  shiftId: string;
  cashierId: string;
  cart: CartLine[];
  orderType: OrderType;
  tableNo?: string | null;
  customerName?: string | null;
  deliveryProvider?: DeliveryProvider | null;
  channelOrderName?: string | null;
  guestCount?: number | null;
  orderNote?: string | null;
  taxPercent: number;
  promoId?: string | null;
}

export interface HeldOrderView {
  orderId: string;
  orderNo: string;
  outletId: string;
  orderType: OrderType;
  tableNo: string | null;
  customerName: string | null;
  deliveryProvider: DeliveryProvider | null;
  channelOrderName: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  promoId: string | null;
  promoName: string | null;
  createdAt: string;
  updatedAt: string;
  lines: Array<{ productId: string | null; name: string; quantity: number; unitPrice: number; note: string | null }>;
}

const DELIVERY_PROVIDERS = new Set<DeliveryProvider>(["gofood", "grabfood", "shopeefood"]);
const POINTS_PER_RUPIAH = 1000;

function cleanText(value: string | null | undefined, max: number): string | null {
  const text = value?.trim();
  if (!text) return null;
  return text.slice(0, max);
}

function normalizeOrderContext(input: Pick<CheckoutInput, "orderType" | "tableNo" | "customerName" | "deliveryProvider" | "channelOrderName" | "orderNote">): {
  tableNo: string | null;
  customerName: string | null;
  deliveryProvider: DeliveryProvider | null;
  channelOrderName: string | null;
  orderNote: string | null;
} {
  const tableNo = cleanText(input.tableNo, 24);
  const customerName = cleanText(input.customerName, 80);
  const channelOrderName = cleanText(input.channelOrderName, 80);
  const orderNote = cleanText(input.orderNote, 240);
  const deliveryProvider = input.deliveryProvider ?? null;

  if (deliveryProvider && !DELIVERY_PROVIDERS.has(deliveryProvider)) {
    throw new Error("Provider delivery tidak valid.");
  }

  if (input.orderType === "dinein") {
    if (!tableNo) throw new Error("Nomor meja wajib untuk dine-in.");
    if (deliveryProvider || channelOrderName) {
      throw new Error("Provider delivery hanya boleh diisi untuk pesanan delivery.");
    }
    return { tableNo, customerName, deliveryProvider: null, channelOrderName: null, orderNote };
  }

  if (input.orderType === "takeaway") {
    if (!customerName) throw new Error("Nama pemesan wajib untuk take away.");
    if (tableNo) throw new Error("Nomor meja hanya boleh diisi untuk dine-in.");
    if (deliveryProvider || channelOrderName) {
      throw new Error("Provider delivery hanya boleh diisi untuk pesanan delivery.");
    }
    return { tableNo: null, customerName, deliveryProvider: null, channelOrderName: null, orderNote };
  }

  if (!deliveryProvider) throw new Error("Provider delivery wajib dipilih.");
  if (!channelOrderName) throw new Error("Nama transaksi marketplace wajib diisi.");
  if (tableNo) throw new Error("Nomor meja hanya boleh diisi untuk dine-in.");

  return { tableNo: null, customerName: null, deliveryProvider, channelOrderName, orderNote };
}

function resolvePromo(db: CheckoutDb, promoId: string | null | undefined, subtotal: number): PromoSnapshot | null {
  const id = promoId?.trim();
  if (!id) return null;
  const promo = db.select().from(discounts).where(and(eq(discounts.id, id), eq(discounts.active, true))).get();
  if (!promo) throw new Error("Promo tidak valid atau sudah tidak aktif.");
  const raw = promo.type === "percent" ? Math.round((subtotal * promo.value) / 100) : promo.value;
  const discountAmount = Math.max(0, Math.min(raw, subtotal));
  return { id: promo.id, name: promo.name, type: promo.type, value: promo.value, discountAmount };
}

interface ResolvedCustomerLink {
  id: string;
  phone: string;
  fullName: string;
}

interface ResolvedVoucherUse {
  id: string;
  code: string;
  memberId: string;
  rewardName: string;
  discountAmount: number;
}

function findCustomerMember(db: CheckoutDb, input: { memberId?: string | null; phone?: string | null }): ResolvedCustomerLink | null {
  const memberId = cleanOptional(input.memberId, 80);
  const phone = input.phone ? normalizeCustomerPhone(input.phone) : "";

  if (memberId) {
    const row = db.select().from(customerMembers).where(eq(customerMembers.id, memberId)).get();
    if (!row) throw new Error("Member customer tidak ditemukan.");
    if (phone && row.phone !== phone) throw new Error("Nomor HP member tidak cocok.");
    return { id: row.id, phone: row.phone, fullName: row.fullName };
  }

  if (!phone) return null;
  if (!/^62\d{8,13}$/.test(phone)) throw new Error("Nomor HP member tidak valid.");
  const row = db.select().from(customerMembers).where(eq(customerMembers.phone, phone)).get();
  if (!row) throw new Error("Member customer tidak ditemukan.");
  return { id: row.id, phone: row.phone, fullName: row.fullName };
}

function normalizeVoucherCode(code: string | null | undefined): string | null {
  const value = code?.trim().toUpperCase();
  return value || null;
}

function voucherDiscountFromRewardName(name: string): number {
  const match = name.match(/Rp\s*([0-9][0-9.]*)/i);
  if (!match) throw new Error("Voucher tidak memiliki nominal diskon.");
  return Number.parseInt(match[1].replace(/\./g, ""), 10);
}

function resolveCustomerVoucher(
  db: CheckoutDb,
  input: { voucherCode?: string | null; member: ResolvedCustomerLink | null; subtotal: number; now: Date },
): { member: ResolvedCustomerLink | null; voucher: ResolvedVoucherUse | null } {
  const code = normalizeVoucherCode(input.voucherCode);
  if (!code) return { member: input.member, voucher: null };

  const row = db
    .select({
      id: customerVouchers.id,
      memberId: customerVouchers.memberId,
      status: customerVouchers.status,
      expiresAt: customerVouchers.expiresAt,
      code: customerVouchers.code,
      fullName: customerMembers.fullName,
      phone: customerMembers.phone,
      rewardName: customerRewards.name,
      rewardCategory: customerRewards.category,
    })
    .from(customerVouchers)
    .innerJoin(customerMembers, eq(customerVouchers.memberId, customerMembers.id))
    .leftJoin(customerRewards, eq(customerVouchers.rewardId, customerRewards.id))
    .where(eq(customerVouchers.code, code))
    .get();

  if (!row) throw new Error("Voucher tidak ditemukan.");
  if (row.status !== "active") throw new Error("Voucher sudah digunakan atau tidak aktif.");
  if (Date.parse(row.expiresAt) <= input.now.getTime()) throw new Error("Voucher sudah kedaluwarsa.");
  if (input.member && input.member.id !== row.memberId) throw new Error("Voucher bukan milik member ini.");
  if (row.rewardCategory !== "voucher" || !row.rewardName) throw new Error("Voucher tidak valid untuk diskon kasir.");

  const discountAmount = Math.min(input.subtotal, voucherDiscountFromRewardName(row.rewardName));
  return {
    member: input.member ?? { id: row.memberId, phone: row.phone, fullName: row.fullName },
    voucher: { id: row.id, code: row.code, memberId: row.memberId, rewardName: row.rewardName, discountAmount },
  };
}

function pointsForPaidOrder(total: number): number {
  return Math.max(0, Math.floor(total / POINTS_PER_RUPIAH));
}

const NON_CASH_REQUIRES_REF = new Set<PaymentMethod>(["qris", "transfer", "ewallet", "card"]);

function cleanOptional(value: string | null | undefined, max = 80): string | null {
  const text = value?.trim();
  if (!text) return null;
  return text.slice(0, max);
}

function normalizePaymentLines(input: CheckoutInput, total: number): Array<Required<Pick<PaymentLineInput, "method" | "amount">> & Omit<PaymentLineInput, "method" | "amount"> & { cashReceived: number | null; changeAmount: number | null; provider: string | null; channelLabel: string | null; referenceNo: string | null }> {
  const raw = input.payments?.length
    ? input.payments
    : input.payment
      ? [{ method: input.payment.method, amount: total, cashReceived: input.payment.cashReceived, referenceNo: input.payment.referenceNo }]
      : [];
  if (raw.length === 0) throw new Error("Minimal satu payment line wajib diisi.");

  let nonCashTotal = 0;
  let cashApplied = 0;
  let cashTendered = 0;
  const lines = raw.map((line, idx) => {
    if (!Number.isInteger(line.amount) || line.amount <= 0) throw new Error(`Nominal payment line ${idx + 1} tidak valid.`);
    const provider = cleanOptional(line.provider);
    const channelLabel = cleanOptional(line.channelLabel);
    const referenceNo = cleanOptional(line.referenceNo);
    if (NON_CASH_REQUIRES_REF.has(line.method) && !referenceNo) {
      throw new Error("Reference wajib untuk pembayaran non-tunai.");
    }
    if (line.method === "card" && !provider) throw new Error("Provider EDC wajib dipilih.");
    if (line.method === "transfer" && !provider) throw new Error("Rekening transfer wajib dipilih.");

    if (line.method === "cash") {
      const received = line.cashReceived ?? line.amount;
      if (!Number.isInteger(received) || received < line.amount) throw new Error("Tunai kurang dari nominal cash line.");
      cashApplied += line.amount;
      cashTendered += received;
      return { ...line, amount: line.amount, cashReceived: received, changeAmount: 0, provider, channelLabel, referenceNo };
    }
    nonCashTotal += line.amount;
    return { ...line, amount: line.amount, cashReceived: null, changeAmount: null, provider, channelLabel, referenceNo };
  });

  if (nonCashTotal + cashApplied !== total) {
    throw new Error("Total payment lines harus sama dengan total order.");
  }
  const change = Math.max(0, cashTendered - cashApplied);
  let changeAssigned = false;
  return lines.map((line) => {
    if (line.method !== "cash") return line;
    if (!changeAssigned) {
      changeAssigned = true;
      return { ...line, changeAmount: change };
    }
    return line;
  });
}

function buildLines(db: CheckoutDb, cart: CartLine[]): OrderLine[] {
  return cart.map((c) => {
    if (!Number.isInteger(c.quantity) || c.quantity <= 0) throw new Error("Kuantitas produk tidak valid.");
    const p = db
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
}

function orderLineValues(orderId: string, lines: OrderLine[]): Array<typeof orderItems.$inferInsert> {
  return lines.map((l) => ({
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
  }));
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
    .where(eq(payments.requestIdempotencyKey, input.idempotencyKey))
    .get();
  if (prior) {
    return { ...buildReceipt(db, prior.orderId), replayed: true };
  }

  const context = normalizeOrderContext(input);

  let orderId: string = randomUUID();
  let orderNo = makeOrderNo();

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
    const lines = buildLines(tx as CheckoutDb, input.cart);
    const subtotalOnly = computeTotals(lines, input.taxPercent, 0).subtotal;
    const promo = resolvePromo(tx as CheckoutDb, input.promoId, subtotalOnly);
    const memberByInput = findCustomerMember(tx as CheckoutDb, {
      memberId: input.customerMemberId,
      phone: input.customerMemberPhone,
    });
    const now = new Date();
    const { member, voucher } = resolveCustomerVoucher(tx as CheckoutDb, {
      voucherCode: input.voucherCode,
      member: memberByInput,
      subtotal: subtotalOnly,
      now,
    });
    const baseDiscountAmount = promo?.discountAmount ?? input.discountAmount ?? 0;
    const discountAmount = Math.min(subtotalOnly, baseDiscountAmount + (voucher?.discountAmount ?? 0));
    const totals = computeTotals(lines, input.taxPercent, discountAmount);
    const pointsEarned = member ? pointsForPaidOrder(totals.total) : 0;

    const paymentLines = normalizePaymentLines(input, totals.total);
    const updatedAt = now.toISOString();

    const heldOrderId = input.heldOrderId?.trim() || null;
    if (heldOrderId) {
      const held = tx.select().from(orders).where(eq(orders.id, heldOrderId)).get();
      if (!held || held.status !== "held") throw new Error("Order tersimpan tidak ditemukan atau sudah dibayar.");
      if (held.outletId !== input.outletId) throw new Error("Order tersimpan di luar outlet ini.");
      tx.update(orders)
        .set({
          shiftId: input.shiftId,
          cashierId: input.cashierId,
          orderType: input.orderType,
          tableNo: context.tableNo,
          customerName: context.customerName,
          customerMemberId: member?.id ?? null,
          customerPhone: member?.phone ?? null,
          deliveryProvider: context.deliveryProvider,
          channelOrderName: context.channelOrderName,
          guestCount: input.guestCount ?? null,
          status: "paid",
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          discountAmount: totals.discountAmount,
          promoId: promo?.id ?? null,
          promoNameSnapshot: promo?.name ?? null,
          total: totals.total,
          note: context.orderNote,
          updatedAt,
        })
        .where(eq(orders.id, heldOrderId))
        .run();
      tx.delete(orderItems).where(eq(orderItems.orderId, heldOrderId)).run();
      orderId = heldOrderId;
      orderNo = held.orderNo;
    } else {
      tx.insert(orders).values({
        id: orderId,
        orderNo,
        outletId: input.outletId,
        shiftId: input.shiftId,
        cashierId: input.cashierId,
        orderType: input.orderType,
        tableNo: context.tableNo,
        customerName: context.customerName,
        customerMemberId: member?.id ?? null,
        customerPhone: member?.phone ?? null,
        deliveryProvider: context.deliveryProvider,
        channelOrderName: context.channelOrderName,
        guestCount: input.guestCount ?? null,
        status: "paid",
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discountAmount: totals.discountAmount,
        promoId: promo?.id ?? null,
        promoNameSnapshot: promo?.name ?? null,
        total: totals.total,
        note: context.orderNote,
      }).run();
    }

    for (const row of orderLineValues(orderId, lines)) {
      tx.insert(orderItems).values(row).run();
    }

    // Payments — request idempotency key groups split lines; per-line key stays unique.
    paymentLines.forEach((line, idx) => {
      tx.insert(payments).values({
        id: randomUUID(),
        orderId,
        idempotencyKey: `${input.idempotencyKey}:${idx + 1}`,
        requestIdempotencyKey: input.idempotencyKey,
        lineNo: idx + 1,
        method: line.method,
        provider: line.provider,
        channelLabel: line.channelLabel,
        amount: line.amount,
        cashReceived: line.cashReceived,
        changeAmount: line.changeAmount,
        referenceNo: line.referenceNo,
        status: "success",
      }).run();
    });

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

    if (voucher) {
      const result = tx
        .update(customerVouchers)
        .set({ status: "used", usedOrderId: orderId, updatedAt })
        .where(and(eq(customerVouchers.id, voucher.id), eq(customerVouchers.status, "active")))
        .run();
      if (result.changes !== 1) throw new Error("Voucher sudah digunakan atau tidak aktif.");

      tx.insert(customerPointEvents).values({
        id: randomUUID(),
        memberId: voucher.memberId,
        kind: "adjust",
        points: 0,
        sourceOrderId: orderId,
        sourceVoucherId: voucher.id,
        note: `Pakai ${voucher.rewardName} (${voucher.code})`,
      }).run();
    }

    if (member && pointsEarned > 0) {
      tx.update(customerMembers)
        .set({
          pointsBalance: sql`${customerMembers.pointsBalance} + ${pointsEarned}`,
          updatedAt,
        })
        .where(eq(customerMembers.id, member.id))
        .run();
      tx.insert(customerPointEvents).values({
        id: randomUUID(),
        memberId: member.id,
        kind: "earn",
        points: pointsEarned,
        sourceOrderId: orderId,
        note: `Belanja ${orderNo}`,
      }).run();
    }
  });

  return buildReceipt(db, orderId);
}


export function saveHeldOrder(db: CheckoutDb, input: HeldOrderInput): HeldOrderView {
  if (input.cart.length === 0) throw new Error("Keranjang kosong.");
  const context = normalizeOrderContext(input);

  let orderId: string = input.orderId?.trim() || randomUUID();
  let orderNo = makeOrderNo();

  db.transaction((tx) => {
    const shift = tx
      .select({ id: shifts.id, status: shifts.status, outletId: shifts.outletId })
      .from(shifts)
      .where(eq(shifts.id, input.shiftId))
      .get();
    if (!shift || shift.status !== "open") throw new Error("Tidak ada shift terbuka.");
    if (shift.outletId !== input.outletId) throw new Error("Shift bukan milik outlet ini.");

    const lines = buildLines(tx as CheckoutDb, input.cart);
    const subtotalOnly = computeTotals(lines, input.taxPercent, 0).subtotal;
    const promo = resolvePromo(tx as CheckoutDb, input.promoId, subtotalOnly);
    const totals = computeTotals(lines, input.taxPercent, promo?.discountAmount ?? 0);

    const existingId = input.orderId?.trim();
    if (existingId) {
      const existing = tx.select().from(orders).where(eq(orders.id, existingId)).get();
      if (!existing || existing.status !== "held") throw new Error("Order tersimpan tidak ditemukan atau sudah dibayar.");
      if (existing.outletId !== input.outletId) throw new Error("Order tersimpan di luar outlet ini.");
      orderNo = existing.orderNo;
      orderId = existing.id;
      tx.update(orders)
        .set({
          shiftId: input.shiftId,
          cashierId: input.cashierId,
          orderType: input.orderType,
          tableNo: context.tableNo,
          customerName: context.customerName,
          deliveryProvider: context.deliveryProvider,
          channelOrderName: context.channelOrderName,
          guestCount: input.guestCount ?? null,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          discountAmount: totals.discountAmount,
          promoId: promo?.id ?? null,
          promoNameSnapshot: promo?.name ?? null,
          total: totals.total,
          note: context.orderNote,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(orders.id, existing.id))
        .run();
      tx.delete(orderItems).where(eq(orderItems.orderId, existing.id)).run();
    } else {
      tx.insert(orders).values({
        id: orderId,
        orderNo,
        outletId: input.outletId,
        shiftId: input.shiftId,
        cashierId: input.cashierId,
        orderType: input.orderType,
        tableNo: context.tableNo,
        customerName: context.customerName,
        deliveryProvider: context.deliveryProvider,
        channelOrderName: context.channelOrderName,
        guestCount: input.guestCount ?? null,
        status: "held",
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discountAmount: totals.discountAmount,
        promoId: promo?.id ?? null,
        promoNameSnapshot: promo?.name ?? null,
        total: totals.total,
        note: context.orderNote,
      }).run();
    }

    for (const row of orderLineValues(orderId, lines)) {
      tx.insert(orderItems).values(row).run();
    }
  });

  return buildHeldOrder(db, orderId);
}

export function listHeldOrders(db: CheckoutDb, outletId: string): HeldOrderView[] {
  const rows = db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.outletId, outletId), eq(orders.status, "held")))
    .orderBy(desc(orders.updatedAt), desc(orders.createdAt))
    .all();
  return rows.map((row) => buildHeldOrder(db, row.id));
}

export function buildHeldOrder(db: CheckoutDb, orderId: string): HeldOrderView {
  const order = db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order || order.status !== "held") throw new Error("Order tersimpan tidak ditemukan.");
  const items = db.select().from(orderItems).where(eq(orderItems.orderId, orderId)).all();
  return {
    orderId: order.id,
    orderNo: order.orderNo,
    outletId: order.outletId,
    orderType: order.orderType,
    tableNo: order.tableNo,
    customerName: order.customerName,
    deliveryProvider: order.deliveryProvider,
    channelOrderName: order.channelOrderName,
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    taxAmount: order.taxAmount,
    total: order.total,
    promoId: order.promoId,
    promoName: order.promoNameSnapshot,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    lines: items.map((it) => ({
      productId: it.productId,
      name: it.nameSnapshot,
      quantity: it.quantity,
      unitPrice: it.priceSnapshot,
      note: it.note,
    })),
  };
}

/** Assemble receipt data for an order (used by checkout + reprint, FR-007). */
export function buildReceipt(db: CheckoutDb, orderId: string): Receipt {
  const order = db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) throw new Error("Order tidak ditemukan.");

  const items = db.select().from(orderItems).where(eq(orderItems.orderId, orderId)).all();
  const payRows = db.select().from(payments).where(eq(payments.orderId, orderId)).all();
  const pointRows = db
    .select({ points: customerPointEvents.points })
    .from(customerPointEvents)
    .where(and(eq(customerPointEvents.sourceOrderId, orderId), eq(customerPointEvents.kind, "earn")))
    .all();
  const voucherRow = db
    .select({ code: customerVouchers.code })
    .from(customerVouchers)
    .where(eq(customerVouchers.usedOrderId, orderId))
    .get();
  const receiptPayments: ReceiptPaymentLine[] = payRows.map((pay) => ({
    method: pay.method,
    provider: pay.provider,
    channelLabel: pay.channelLabel,
    amount: pay.amount,
    cashReceived: pay.cashReceived,
    changeAmount: pay.changeAmount,
    referenceNo: pay.referenceNo,
  }));
  const fallbackPayment: ReceiptPaymentLine = { method: "cash", provider: null, channelLabel: null, amount: order.total, cashReceived: null, changeAmount: null, referenceNo: null };

  return {
    orderId: order.id,
    orderNo: order.orderNo,
    outletId: order.outletId,
    createdAt: order.createdAt,
    orderType: order.orderType,
    tableNo: order.tableNo,
    customerName: order.customerName,
    customerMemberId: order.customerMemberId,
    customerPhone: order.customerPhone,
    deliveryProvider: order.deliveryProvider,
    channelOrderName: order.channelOrderName,
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
    promoId: order.promoId,
    promoName: order.promoNameSnapshot,
    pointsEarned: pointRows.reduce((total, row) => total + row.points, 0),
    voucherCode: voucherRow?.code ?? null,
    payment: receiptPayments[0] ?? fallbackPayment,
    payments: receiptPayments.length ? receiptPayments : [fallbackPayment],
    replayed: false,
  };
}
