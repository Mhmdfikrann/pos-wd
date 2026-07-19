/**
 * Refund / void / manual-discount data access (Phase 9).
 *
 * DB-parameterized like the other critical services. It owns financial
 * invariants and returns audit intents; server actions are responsible for
 * RBAC/outlet enforcement at the request boundary and for writing audit rows
 * through `writeAudit`.
 */
import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
  approvalRequests,
  orders,
  refunds,
} from "@/db/schema";
import type { AuditAction } from "@/lib/audit";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FinanceDb = BetterSQLite3Database<any>;

export type ApprovalKind = "refund" | "void" | "discount";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface ApprovalRequestView {
  id: string;
  outletId: string;
  kind: ApprovalKind;
  status: ApprovalStatus;
  targetOrderId: string;
  orderNo: string;
  amount: number | null;
  reason: string;
  requestedById: string;
  approvedById: string | null;
  rejectedById: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface FinanceAuditEvent {
  action: AuditAction;
  outletId: string;
  entity: string;
  entityId: string;
  detail: Record<string, unknown>;
}

export interface ApproveRefundResult {
  request: ApprovalRequestView;
  refund: typeof refunds.$inferSelect;
  auditEvents: FinanceAuditEvent[];
}

export interface ApproveOrderResult {
  request: ApprovalRequestView;
  order: typeof orders.$inferSelect;
  auditEvents: FinanceAuditEvent[];
}

export interface FinanceOrderView {
  id: string;
  orderNo: string;
  outletId: string;
  status: typeof orders.$inferSelect.status;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  refundedAmount: number;
  createdAt: string;
}

export function getFinanceOrder(db: FinanceDb, orderId: string): FinanceOrderView {
  const order = db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) throw new Error("Order tidak ditemukan.");
  return toFinanceOrder(db, order);
}

export function listFinanceOrders(db: FinanceDb, input: { outletIds: string[]; limit?: number }): FinanceOrderView[] {
  if (input.outletIds.length === 0) return [];
  const limit = input.limit ?? 30;
  return db
    .select()
    .from(orders)
    .where(inArray(orders.outletId, input.outletIds))
    .orderBy(asc(orders.createdAt), asc(orders.id))
    .all()
    .slice(-limit)
    .reverse()
    .map((order) => toFinanceOrder(db, order));
}

export function listApprovalRequests(
  db: FinanceDb,
  input: { outletIds: string[]; status?: ApprovalStatus },
): ApprovalRequestView[] {
  if (input.outletIds.length === 0) return [];
  const status = input.status ?? "pending";
  const rows = db
    .select({
      id: approvalRequests.id,
      outletId: approvalRequests.outletId,
      kind: approvalRequests.kind,
      status: approvalRequests.status,
      targetOrderId: approvalRequests.targetOrderId,
      orderNo: orders.orderNo,
      amount: approvalRequests.amount,
      reason: approvalRequests.reason,
      requestedById: approvalRequests.requestedById,
      approvedById: approvalRequests.approvedById,
      rejectedById: approvalRequests.rejectedById,
      resolvedAt: approvalRequests.resolvedAt,
      createdAt: approvalRequests.createdAt,
    })
    .from(approvalRequests)
    .innerJoin(orders, eq(approvalRequests.targetOrderId, orders.id))
    .where(and(inArray(approvalRequests.outletId, input.outletIds), eq(approvalRequests.status, status)))
    .orderBy(asc(approvalRequests.createdAt), asc(approvalRequests.id))
    .all();
  return rows;
}

export function requestRefund(
  db: FinanceDb,
  input: { orderId: string; amount: number; reason: string; requestedById: string },
): ApprovalRequestView {
  const amount = cleanRupiah(input.amount, "Nominal refund");
  const reason = cleanReason(input.reason);
  return db.transaction((tx) => {
    const order = getPaidOrder(tx, input.orderId);
    const remaining = remainingRefundable(tx, order.id, order.total);
    if (amount > remaining) {
      throw new Error("Nominal refund melebihi sisa pembayaran yang belum direfund.");
    }
    const request = createApprovalRequest(tx, {
      kind: "refund",
      outletId: order.outletId,
      targetOrderId: order.id,
      amount,
      reason,
      requestedById: input.requestedById,
    });
    return request;
  });
}

export function approveRefund(
  db: FinanceDb,
  input: { requestId: string; approverId: string; outletIds: string[]; now?: string },
): ApproveRefundResult {
  return db.transaction((tx) => {
    const request = getPendingRequest(tx, input.requestId, "refund", input.outletIds);
    if (request.amount == null) throw new Error("Nominal refund tidak valid.");
    const order = getPaidOrder(tx, request.targetOrderId);
    const remaining = approvedRemainingRefundable(tx, order.id, order.total);
    if (request.amount > remaining) {
      throw new Error("Nominal refund melebihi sisa pembayaran yang belum direfund.");
    }

    const refundId = randomUUID();
    tx.insert(refunds)
      .values({
        id: refundId,
        orderId: order.id,
        amount: request.amount,
        reason: request.reason,
        actorId: request.requestedById,
        approvedById: input.approverId,
      })
      .run();

    resolveRequest(tx, request.id, "approved", input.approverId, input.now);
    const totalRefunded = order.total - remaining + request.amount;
    if (totalRefunded >= order.total) {
      tx.update(orders).set({ status: "refunded" }).where(eq(orders.id, order.id)).run();
    }

    const refund = tx.select().from(refunds).where(eq(refunds.id, refundId)).get();
    if (!refund) throw new Error("Gagal mencatat refund.");
    const updatedRequest = getRequestView(tx, request.id);
    return {
      request: updatedRequest,
      refund,
      auditEvents: [
        {
          action: "refund.approve",
          outletId: order.outletId,
          entity: "refund",
          entityId: refund.id,
          detail: { orderId: order.id, orderNo: order.orderNo, amount: refund.amount, reason: refund.reason },
        },
      ],
    };
  });
}

export function requestVoid(
  db: FinanceDb,
  input: { orderId: string; reason: string; requestedById: string },
): ApprovalRequestView {
  const reason = cleanReason(input.reason);
  return db.transaction((tx) => {
    const order = getPaidOrder(tx, input.orderId);
    return createApprovalRequest(tx, {
      kind: "void",
      outletId: order.outletId,
      targetOrderId: order.id,
      amount: order.total,
      reason,
      requestedById: input.requestedById,
    });
  });
}

export function approveVoid(
  db: FinanceDb,
  input: { requestId: string; approverId: string; outletIds: string[]; now?: string },
): ApproveOrderResult {
  return db.transaction((tx) => {
    const request = getPendingRequest(tx, input.requestId, "void", input.outletIds);
    const order = getPaidOrder(tx, request.targetOrderId);

    tx.update(orders).set({ status: "void" }).where(eq(orders.id, order.id)).run();
    resolveRequest(tx, request.id, "approved", input.approverId, input.now);

    const updated = tx.select().from(orders).where(eq(orders.id, order.id)).get();
    if (!updated) throw new Error("Gagal void order.");
    return {
      request: getRequestView(tx, request.id),
      order: updated,
      auditEvents: [
        {
          action: "void.approve",
          outletId: order.outletId,
          entity: "order",
          entityId: order.id,
          detail: { orderNo: order.orderNo, amount: order.total, reason: request.reason },
        },
      ],
    };
  });
}

export function requestManualDiscount(
  db: FinanceDb,
  input: { orderId: string; amount: number; reason: string; requestedById: string },
): ApprovalRequestView {
  const amount = cleanRupiah(input.amount, "Nominal diskon");
  const reason = cleanReason(input.reason);
  return db.transaction((tx) => {
    const order = getPaidOrder(tx, input.orderId);
    if (amount > order.subtotal) {
      throw new Error("Nominal diskon melebihi subtotal order.");
    }
    return createApprovalRequest(tx, {
      kind: "discount",
      outletId: order.outletId,
      targetOrderId: order.id,
      amount,
      reason,
      requestedById: input.requestedById,
    });
  });
}

export function approveManualDiscount(
  db: FinanceDb,
  input: { requestId: string; approverId: string; outletIds: string[]; now?: string },
): ApproveOrderResult {
  return db.transaction((tx) => {
    const request = getPendingRequest(tx, input.requestId, "discount", input.outletIds);
    if (request.amount == null) throw new Error("Nominal diskon tidak valid.");
    const order = getPaidOrder(tx, request.targetOrderId);
    if (request.amount > order.subtotal) {
      throw new Error("Nominal diskon melebihi subtotal order.");
    }
    const discountedBase = order.subtotal - request.amount;
    const total = discountedBase + order.taxAmount;

    tx.update(orders)
      .set({ discountAmount: request.amount, total })
      .where(eq(orders.id, order.id))
      .run();
    resolveRequest(tx, request.id, "approved", input.approverId, input.now);

    const updated = tx.select().from(orders).where(eq(orders.id, order.id)).get();
    if (!updated) throw new Error("Gagal menerapkan diskon manual.");
    return {
      request: getRequestView(tx, request.id),
      order: updated,
      auditEvents: [
        {
          action: "discount.apply",
          outletId: order.outletId,
          entity: "order",
          entityId: order.id,
          detail: { orderNo: order.orderNo, amount: request.amount, reason: request.reason },
        },
      ],
    };
  });
}

function createApprovalRequest(
  db: FinanceDb,
  input: {
    kind: ApprovalKind;
    outletId: string;
    targetOrderId: string;
    amount: number | null;
    reason: string;
    requestedById: string;
  },
): ApprovalRequestView {
  const id = randomUUID();
  db.insert(approvalRequests)
    .values({
      id,
      outletId: input.outletId,
      kind: input.kind,
      targetOrderId: input.targetOrderId,
      amount: input.amount,
      reason: input.reason,
      requestedById: input.requestedById,
      status: "pending",
    })
    .run();
  return getRequestView(db, id);
}

function getRequestView(db: FinanceDb, id: string): ApprovalRequestView {
  const row = db
    .select({
      id: approvalRequests.id,
      outletId: approvalRequests.outletId,
      kind: approvalRequests.kind,
      status: approvalRequests.status,
      targetOrderId: approvalRequests.targetOrderId,
      orderNo: orders.orderNo,
      amount: approvalRequests.amount,
      reason: approvalRequests.reason,
      requestedById: approvalRequests.requestedById,
      approvedById: approvalRequests.approvedById,
      rejectedById: approvalRequests.rejectedById,
      resolvedAt: approvalRequests.resolvedAt,
      createdAt: approvalRequests.createdAt,
    })
    .from(approvalRequests)
    .innerJoin(orders, eq(approvalRequests.targetOrderId, orders.id))
    .where(eq(approvalRequests.id, id))
    .get();
  if (!row) throw new Error("Approval request tidak ditemukan.");
  return row;
}

function getPendingRequest(
  db: FinanceDb,
  requestId: string,
  kind: ApprovalKind,
  outletIds: string[],
): ApprovalRequestView {
  const request = getRequestView(db, requestId);
  if (request.kind !== kind) throw new Error("Jenis approval tidak sesuai.");
  if (request.status !== "pending") throw new Error("Approval request sudah diproses.");
  if (!outletIds.includes(request.outletId)) throw new Error("Approval request di luar outlet Anda.");
  return request;
}

function resolveRequest(
  db: FinanceDb,
  requestId: string,
  status: "approved" | "rejected",
  actorId: string,
  now?: string,
): void {
  db.update(approvalRequests)
    .set({
      status,
      approvedById: status === "approved" ? actorId : null,
      rejectedById: status === "rejected" ? actorId : null,
      resolvedAt: now ?? new Date().toISOString(),
    })
    .where(eq(approvalRequests.id, requestId))
    .run();
}

function getPaidOrder(db: FinanceDb, orderId: string): typeof orders.$inferSelect {
  const order = db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) throw new Error("Order tidak ditemukan.");
  if (order.status !== "paid") {
    throw new Error("Hanya order paid yang dapat diproses refund/void/diskon.");
  }
  return order;
}

function toFinanceOrder(db: FinanceDb, order: typeof orders.$inferSelect): FinanceOrderView {
  return {
    id: order.id,
    orderNo: order.orderNo,
    outletId: order.outletId,
    status: order.status,
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    taxAmount: order.taxAmount,
    total: order.total,
    refundedAmount: totalApprovedRefunds(db, order.id),
    createdAt: order.createdAt,
  };
}

function remainingRefundable(db: FinanceDb, orderId: string, total: number): number {
  const approved = totalApprovedRefunds(db, orderId);
  const pending = db
    .select({ amount: approvalRequests.amount })
    .from(approvalRequests)
    .where(
      and(
        eq(approvalRequests.targetOrderId, orderId),
        eq(approvalRequests.kind, "refund"),
        eq(approvalRequests.status, "pending"),
      ),
    )
    .all()
    .reduce((sum, request) => sum + (request.amount ?? 0), 0);
  return Math.max(0, total - approved - pending);
}

function approvedRemainingRefundable(db: FinanceDb, orderId: string, total: number): number {
  return Math.max(0, total - totalApprovedRefunds(db, orderId));
}

function totalApprovedRefunds(db: FinanceDb, orderId: string): number {
  return db
    .select({ amount: refunds.amount })
    .from(refunds)
    .where(eq(refunds.orderId, orderId))
    .all()
    .reduce((sum, refund) => sum + refund.amount, 0);
}

function cleanRupiah(value: unknown, label: string): number {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
    throw new Error(`${label} harus bilangan rupiah bulat > 0.`);
  }
  return amount;
}

function cleanReason(reason: string): string {
  const trimmed = reason.trim();
  if (trimmed.length < 3) throw new Error("Alasan wajib diisi.");
  return trimmed;
}
