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
  saveHeldOrder,
  buildReceipt,
  type CartLine,
  type OrderType,
  type DeliveryProvider,
  type PaymentMethod,
  type PaymentLineInput,
  type Receipt,
  type HeldOrderView,
} from "@/lib/order";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";

const PERM = "payment.accept";

export type ActionResult<T = void> = ({ ok: true } & T) | { ok: false; error: string };

export interface CheckoutRequest {
  outletId: string;
  heldOrderId?: string | null;
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
  payment?: {
    method: PaymentMethod;
    cashReceived: number;
    referenceNo?: string | null;
  };
  payments?: PaymentLineInput[];
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
      heldOrderId: req.heldOrderId,
      shiftId: shift.id,
      cashierId: session.userId,
      cart: req.cart,
      orderType: req.orderType,
      tableNo: req.tableNo,
      customerName: req.customerName,
      deliveryProvider: req.deliveryProvider,
      channelOrderName: req.channelOrderName,
      guestCount: req.guestCount,
      orderNote: req.orderNote,
      taxPercent: req.taxPercent,
      promoId: req.promoId,
      payment: req.payment,
      payments: req.payments,
      idempotencyKey: req.idempotencyKey,
    });

    // Audit only a fresh sale, not an idempotent replay.
    if (!receipt.replayed) {
      if (req.heldOrderId) {
        await writeAudit({
          action: "order.resumed",
          actorId: session.userId,
          outletId: req.outletId,
          entity: "order",
          entityId: receipt.orderId,
          detail: { orderNo: receipt.orderNo },
        });
      }
      if (receipt.promoId) {
        await writeAudit({
          action: "promotion.applied",
          actorId: session.userId,
          outletId: req.outletId,
          entity: "order",
          entityId: receipt.orderId,
          detail: { orderNo: receipt.orderNo, promoId: receipt.promoId, promoName: receipt.promoName, discountAmount: receipt.discountAmount },
        });
      }
      if (receipt.payments.length > 1) {
        await writeAudit({
          action: "payment.split.accepted",
          actorId: session.userId,
          outletId: req.outletId,
          entity: "order",
          entityId: receipt.orderId,
          detail: { orderNo: receipt.orderNo, lines: receipt.payments.map((line) => ({ method: line.method, provider: line.provider, amount: line.amount })) },
        });
      }
      await writeAudit({
        action: "order.paid",
        actorId: session.userId,
        outletId: req.outletId,
        entity: "order",
        entityId: receipt.orderId,
        detail: { orderNo: receipt.orderNo, total: receipt.total, payments: receipt.payments.map((line) => ({ method: line.method, provider: line.provider, amount: line.amount })), heldOrderId: req.heldOrderId ?? null, promoId: receipt.promoId, discountAmount: receipt.discountAmount },
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
        .where(eq(payments.requestIdempotencyKey, req.idempotencyKey))
        .get();
      if (prior) {
        return { ok: true, receipt: { ...buildReceipt(prior.orderId), replayed: true } };
      }
    }

    // User-friendly validation messages from the service pass through.
    if (/kosong|shift terbuka|tidak ditemukan|tidak tersedia|tunai kurang|rupiah|Kuantitas|Nomor meja|Nama pemesan|Provider delivery|marketplace|Promo|Order tersimpan|payment|Reference|EDC|Transfer|Tunai/i.test(msg)) {
      return { ok: false, error: msg };
    }
    console.error("[order-action] checkout failed:", err);
    return { ok: false, error: "Gagal memproses pembayaran. Coba lagi." };
  }
}


export interface SaveHeldOrderRequest {
  orderId?: string | null;
  outletId: string;
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

export async function actionSaveHeldOrder(
  req: SaveHeldOrderRequest,
): Promise<ActionResult<{ heldOrder: HeldOrderView }>> {
  try {
    const session = await requirePermission(PERM);
    assertOutletAccess(session, req.outletId);

    const shift = await getActiveShift(req.outletId, session.userId);
    if (!shift) return { ok: false, error: "Tidak ada shift terbuka. Buka shift dulu." };

    const heldOrder = saveHeldOrder({
      orderId: req.orderId,
      outletId: req.outletId,
      shiftId: shift.id,
      cashierId: session.userId,
      cart: req.cart,
      orderType: req.orderType,
      tableNo: req.tableNo,
      customerName: req.customerName,
      deliveryProvider: req.deliveryProvider,
      channelOrderName: req.channelOrderName,
      guestCount: req.guestCount,
      orderNote: req.orderNote,
      taxPercent: req.taxPercent,
      promoId: req.promoId,
    });

    await writeAudit({
      action: "order.held",
      actorId: session.userId,
      outletId: req.outletId,
      entity: "order",
      entityId: heldOrder.orderId,
      detail: { orderNo: heldOrder.orderNo, total: heldOrder.total, promoId: heldOrder.promoId, discountAmount: heldOrder.discountAmount },
    });

    revalidatePath("/kasir");
    return { ok: true, heldOrder };
  } catch (err) {
    if (err instanceof PermissionError) return { ok: false, error: "Anda tidak punya izin menyimpan order." };
    if (err instanceof OutletScopeError) return { ok: false, error: "Outlet ini di luar akses Anda." };
    const msg = err instanceof Error ? err.message : String(err);
    if (/kosong|shift terbuka|tidak ditemukan|tidak tersedia|rupiah|Kuantitas|Nomor meja|Nama pemesan|Provider delivery|marketplace|Promo|Order tersimpan|payment|Reference|EDC|Transfer|Tunai/i.test(msg)) {
      return { ok: false, error: msg };
    }
    console.error("[order-action] save held failed:", err);
    return { ok: false, error: "Gagal menyimpan order. Coba lagi." };
  }
}
