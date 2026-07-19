/**
 * Pure order-total math (Phase 5, PRD §8.4, BR-001, BR-002).
 *
 * The single source of truth for how a cart becomes money. DB-free so it can be
 * unit-tested and shared: the checkout service (`order.ts`) computes totals with
 * these, and the client mirrors them for display — but the SERVER value is
 * authoritative (the client total is never trusted at checkout).
 *
 * Everything is integer rupiah (BR-002): no floats reach the DB. Tax is computed
 * on the discounted subtotal and rounded once, at the end, so the stored
 * subtotal/tax/discount/total always satisfy `total = subtotal - discount + tax`.
 */

/** One priced line in a cart. `unitPrice` is integer rupiah (price + variant delta). */
export interface OrderLine {
  productId: string;
  nameSnapshot: string;
  skuSnapshot: string | null;
  variantSnapshot: string | null;
  unitPrice: number;
  costSnapshot: number;
  quantity: number;
  note: string | null;
}

export interface OrderTotals {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
}

/** Assert an amount is a non-negative integer rupiah (BR-002). */
function assertRupiah(n: number, field: string): number {
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    throw new Error(`${field} harus bilangan rupiah bulat ≥ 0.`);
  }
  return n;
}

/** Assert a quantity is a positive integer. */
function assertQty(n: number): number {
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    throw new Error("Kuantitas harus bilangan bulat > 0.");
  }
  return n;
}

/**
 * Compute order totals from lines, a tax percent, and an optional discount.
 *
 * - `subtotal` = Σ unitPrice × quantity.
 * - `discountAmount` is clamped to [0, subtotal] (can't discount below zero).
 * - `taxAmount` = round(taxPercent% × (subtotal − discount)) — tax on the
 *   discounted base, rounded once (BR-002).
 * - `total` = subtotal − discount + tax.
 *
 * Throws on non-integer/negative money or bad quantities — bad input never
 * silently produces a wrong total.
 */
export function computeTotals(
  lines: OrderLine[],
  taxPercent: number,
  discountAmount = 0,
): OrderTotals {
  if (!Number.isFinite(taxPercent) || taxPercent < 0) {
    throw new Error("Persen pajak tidak valid.");
  }

  const subtotal = lines.reduce((sum, l) => {
    assertRupiah(l.unitPrice, "Harga");
    assertQty(l.quantity);
    return sum + l.unitPrice * l.quantity;
  }, 0);

  const discount = Math.min(assertRupiah(discountAmount, "Diskon"), subtotal);
  const taxable = subtotal - discount;
  const taxAmount = Math.round((taxable * taxPercent) / 100);
  const total = taxable + taxAmount;

  return { subtotal, discountAmount: discount, taxAmount, total };
}

/**
 * Cash-payment change (BR-015). Throws if cash received is less than the total —
 * a cash sale can't complete underpaid. Non-cash methods pass `cashReceived`
 * equal to total (no change).
 */
export function computeChange(total: number, cashReceived: number): number {
  assertRupiah(total, "Total");
  assertRupiah(cashReceived, "Uang diterima");
  if (cashReceived < total) {
    throw new Error("Uang tunai kurang dari total.");
  }
  return cashReceived - total;
}
