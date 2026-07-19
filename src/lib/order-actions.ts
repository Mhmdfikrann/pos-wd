"use server";

/**
 * Checkout server action (Phase 5, PRD §8.5/§10.2, BR-003/004/007/008/010, §8.10).
 *
 * The authoritative payment entry point:
 *  1. `requirePermission("payment.accept")` — Owner/Manager/Kasir hold it.
 *  2. Outlet scope (BR-010): the target outlet must be in the caller's scope.
 *  3. The cashier's own OPEN shift at that outlet is resolved server-side — the
 *     client never supplies the shiftId, and payment without an open shift is
 *     rejected (BR-008).
 *  4. `checkout()` runs the atomic transaction; prices/totals come from the DB.
 *  5. Idempotency (BR-003): a repeated key replays the receipt. If two requests
 *     race past the pre-check, the unique index throws — we catch that and replay,
 *     so a double-submit always yields the same receipt, never a double charge.
 *  6. Audit the sale (§8.10) and `revalidatePath("/kasir")`.
 *
 * Returns a discriminated `{ ok: true, receipt } | { ok: false, error }`.
 */
import { revalidatePath } from "next/cache";
import { requirePermission, PermissionError } from "@/lib/session";
import { assertOutletAccess, OutletScopeError } from "@/lib/outlet-scope";
import { writeAudit } from "@/lib/audit";
import { getActiveShift } from "@/lib/shift";
import {
  checkout,
  buildReceipt,
  type CartLine,
  type OrderType,
  type PaymentMethod,
  type Receipt,
} from "@/lib/order";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";

const PERM = "payment.accept";

export type ActionResult<T = void> = ({ ok: true } & T) | { ok: false; error: string };

export interface CheckoutRequest {
  outletId: string;
  cart: CartLine[];
  orderType: OrderType;
  tableNo?: string | null;
  guestCount?: number | null;
  orderNote?: string | null;
  taxPercent: number;
  discountAmount?: number;
  payment: {
    method: PaymentMethod;
    cashReceived: number;
    referenceNo?: string | null;
  };
  /** BR-003 — generated once per checkout attempt on the client. */
  idempotencyKey: string;
}

export async function actionCheckout(
  req: CheckoutRequest,
): Promise<ActionResult<{ receipt: Receipt }>> {
  try {
    const session = await requirePermission(PERM);
    assertOutletAccess(session, req.outletId);

    // Resolve the caller's OWN open shift server-side (BR-008) — never trust a
    // client shiftId. No open shift → payment rejected.
    const shift = await getActiveShift(req.outletId, session.userId);
    if (!shift) {
      return { ok: false, error: "Tidak ada shift terbuka. Buka shift dulu." };
    }

    const receipt = checkout({
      outletId: req.outletId,
      shiftId: shift.id,
      cashierId: session.userId,
      cart: req.cart,
      orderType: req.orderType,
      tableNo: req.tableNo,
      guestCount: req.guestCount,
      orderNote: req.orderNote,
      taxPercent: req.taxPercent,
      discountAmount: req.discountAmount,
      payment: req.payment,
      idempotencyKey: req.idempotencyKey,
    });

    // Audit only a fresh sale, not an idempotent replay.
    if (!receipt.replayed) {
      await writeAudit({
        action: "order.paid",
        actorId: session.userId,
        outletId: req.outletId,
        entity: "order",
        entityId: receipt.orderId,
        detail: { orderNo: receipt.orderNo, total: receipt.total, method: receipt.payment.method },
      });
    }

    revalidatePath("/kasir");
    return { ok: true, receipt };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { ok: false, error: "Anda tidak punya izin menerima pembayaran." };
    }
    if (err instanceof OutletScopeError) {
      return { ok: false, error: "Outlet ini di luar akses Anda." };
    }
    const msg = err instanceof Error ? err.message : String(err);

    // Race on the idempotency key: the pre-check missed but the unique index
    // caught it. Replay the existing receipt instead of surfacing an error.
    if (/UNIQUE|unique/.test(msg) && /idempotency/i.test(msg)) {
      const prior = db
        .select({ orderId: payments.orderId })
        .from(payments)
        .where(eq(payments.idempotencyKey, req.idempotencyKey))
        .get();
      if (prior) {
        return { ok: true, receipt: { ...buildReceipt(prior.orderId), replayed: true } };
      }
    }

    // User-friendly validation messages from the service pass through.
    if (/kosong|shift terbuka|tidak ditemukan|tidak tersedia|tunai kurang|rupiah|Kuantitas/i.test(msg)) {
      return { ok: false, error: msg };
    }
    console.error("[order-action] checkout failed:", err);
    return { ok: false, error: "Gagal memproses pembayaran. Coba lagi." };
  }
}
