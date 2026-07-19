/**
 * Finance approval wrapper bound to the app DB (Phase 9).
 */
import "server-only";
import { db } from "@/db";
import {
  approveManualDiscount as approveManualDiscountCore,
  approveRefund as approveRefundCore,
  approveVoid as approveVoidCore,
  getFinanceOrder as getFinanceOrderCore,
  listApprovalRequests as listApprovalRequestsCore,
  listFinanceOrders as listFinanceOrdersCore,
  requestManualDiscount as requestManualDiscountCore,
  requestRefund as requestRefundCore,
  requestVoid as requestVoidCore,
  type ApprovalRequestView,
  type ApprovalStatus,
  type ApproveOrderResult,
  type ApproveRefundResult,
  type FinanceOrderView,
} from "@/lib/finance-data";

export type {
  ApprovalKind,
  ApprovalRequestView,
  ApprovalStatus,
  ApproveOrderResult,
  ApproveRefundResult,
  FinanceAuditEvent,
  FinanceOrderView,
} from "@/lib/finance-data";

export function listApprovalRequests(input: {
  outletIds: string[];
  status?: ApprovalStatus;
}): ApprovalRequestView[] {
  return listApprovalRequestsCore(db, input);
}

export function listFinanceOrders(input: { outletIds: string[]; limit?: number }): FinanceOrderView[] {
  return listFinanceOrdersCore(db, input);
}

export function getFinanceOrder(orderId: string): FinanceOrderView {
  return getFinanceOrderCore(db, orderId);
}

export function requestRefund(input: {
  orderId: string;
  amount: number;
  reason: string;
  requestedById: string;
}): ApprovalRequestView {
  return requestRefundCore(db, input);
}

export function approveRefund(input: {
  requestId: string;
  approverId: string;
  outletIds: string[];
}): ApproveRefundResult {
  return approveRefundCore(db, input);
}

export function requestVoid(input: {
  orderId: string;
  reason: string;
  requestedById: string;
}): ApprovalRequestView {
  return requestVoidCore(db, input);
}

export function approveVoid(input: {
  requestId: string;
  approverId: string;
  outletIds: string[];
}): ApproveOrderResult {
  return approveVoidCore(db, input);
}

export function requestManualDiscount(input: {
  orderId: string;
  amount: number;
  reason: string;
  requestedById: string;
}): ApprovalRequestView {
  return requestManualDiscountCore(db, input);
}

export function approveManualDiscount(input: {
  requestId: string;
  approverId: string;
  outletIds: string[];
}): ApproveOrderResult {
  return approveManualDiscountCore(db, input);
}
