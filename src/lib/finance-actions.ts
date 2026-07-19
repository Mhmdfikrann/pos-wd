"use server";

import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import {
  approveManualDiscount,
  approveRefund,
  approveVoid,
  getFinanceOrder,
  requestManualDiscount,
  requestRefund,
  requestVoid,
  type ApprovalKind,
  type ApprovalRequestView,
} from "@/lib/finance";
import {
  assertOutletAccess,
  OutletScopeError,
  PermissionError,
  requirePermission,
} from "@/lib/session";

export type ActionResult<T extends object | undefined = undefined> =
  | (T extends object ? ({ ok: true } & T) : { ok: true })
  | { ok: false; error: string };

export async function actionRequestRefund(input: {
  orderId: string;
  amount: number;
  reason: string;
}): Promise<ActionResult<{ request: ApprovalRequestView }>> {
  try {
    const session = await requirePermission("refund.request");
    const order = getFinanceOrder(input.orderId);
    assertOutletAccess(session, order.outletId);
    const request = requestRefund({
      orderId: input.orderId,
      amount: input.amount,
      reason: input.reason,
      requestedById: session.userId,
    });
    await writeAudit({
      action: "refund.request",
      actorId: session.userId,
      outletId: order.outletId,
      entity: "approval_request",
      entityId: request.id,
      detail: { orderNo: order.orderNo, amount: input.amount, reason: input.reason },
    });
    revalidateFinancePaths();
    return { ok: true, request };
  } catch (err) {
    return financeActionError(err, "refund");
  }
}

export async function actionRequestVoid(input: {
  orderId: string;
  reason: string;
}): Promise<ActionResult<{ request: ApprovalRequestView }>> {
  try {
    const session = await requirePermission("refund.request");
    const order = getFinanceOrder(input.orderId);
    assertOutletAccess(session, order.outletId);
    const request = requestVoid({
      orderId: input.orderId,
      reason: input.reason,
      requestedById: session.userId,
    });
    await writeAudit({
      action: "void.request",
      actorId: session.userId,
      outletId: order.outletId,
      entity: "approval_request",
      entityId: request.id,
      detail: { orderNo: order.orderNo, amount: order.total, reason: input.reason },
    });
    revalidateFinancePaths();
    return { ok: true, request };
  } catch (err) {
    return financeActionError(err, "void");
  }
}

export async function actionRequestManualDiscount(input: {
  orderId: string;
  amount: number;
  reason: string;
}): Promise<ActionResult<{ request: ApprovalRequestView }>> {
  try {
    const session = await requirePermission("discount.apply");
    const order = getFinanceOrder(input.orderId);
    assertOutletAccess(session, order.outletId);
    const request = requestManualDiscount({
      orderId: input.orderId,
      amount: input.amount,
      reason: input.reason,
      requestedById: session.userId,
    });
    await writeAudit({
      action: "discount.request",
      actorId: session.userId,
      outletId: order.outletId,
      entity: "approval_request",
      entityId: request.id,
      detail: { orderNo: order.orderNo, amount: input.amount, reason: input.reason },
    });
    revalidateFinancePaths();
    return { ok: true, request };
  } catch (err) {
    return financeActionError(err, "diskon");
  }
}

export async function actionApproveRequest(input: {
  requestId: string;
  kind: ApprovalKind;
}): Promise<ActionResult> {
  try {
    const permission = input.kind === "refund" ? "refund.approve" : "void.approve";
    const session = await requirePermission(permission);

    const result =
      input.kind === "refund"
        ? approveRefund({ requestId: input.requestId, approverId: session.userId, outletIds: session.outletIds })
        : input.kind === "void"
          ? approveVoid({ requestId: input.requestId, approverId: session.userId, outletIds: session.outletIds })
          : approveManualDiscount({ requestId: input.requestId, approverId: session.userId, outletIds: session.outletIds });

    for (const event of result.auditEvents) {
      await writeAudit({
        action: event.action,
        actorId: session.userId,
        outletId: event.outletId,
        entity: event.entity,
        entityId: event.entityId,
        detail: event.detail,
      });
    }
    revalidateFinancePaths();
    return { ok: true };
  } catch (err) {
    return financeActionError(err, "approval");
  }
}

function revalidateFinancePaths(): void {
  revalidatePath("/manager");
  revalidatePath("/kasir");
  revalidatePath("/owner");
}

function financeActionError<T extends object | undefined>(err: unknown, label: string): ActionResult<T> {
  if (err instanceof PermissionError) {
    return { ok: false, error: "Anda tidak punya izin untuk aksi ini." };
  }
  if (err instanceof OutletScopeError) {
    return { ok: false, error: "Data transaksi di luar outlet Anda." };
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (/order|refund|diskon|approval|outlet|alasan|paid|subtotal|nominal/i.test(msg)) {
    return { ok: false, error: msg };
  }
  console.error(`[finance-action] ${label} failed:`, err);
  return { ok: false, error: `Gagal memproses ${label}.` };
}
