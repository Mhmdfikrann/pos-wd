/**
 * Audit log writer (PRD §8.10, BR-011).
 *
 * Every sensitive action — login, refund, void, discount, cash/stock adjustment,
 * role/permission change — lands in `audit_logs` with an actor, an action key,
 * and an optional entity + detail. This module is the single choke point so the
 * shape stays consistent and callers never touch the table directly.
 *
 * Writes are best-effort: an audit failure must never break the action being
 * audited (a login should still succeed even if the log insert hiccups), so
 * `writeAudit` swallows and logs its own errors rather than throwing.
 *
 * Server-only — never import from a client component.
 */
import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";

/** Canonical action keys. Extend as later phases add audited actions. */
export type AuditAction =
  | "auth.login"
  | "auth.logout"
  | "catalog.product_create"
  | "catalog.price_change"
  | "catalog.product_deactivate"
  | "catalog.product_delete"
  | "catalog.category_delete"
  | "catalog.bulk_import"
  | "shift.open"
  | "shift.close"
  | "order.held"
  | "order.resumed"
  | "order.paid"
  | "promotion.applied"
  | "payment.split.accepted"
  | "refund.request"
  | "refund.approve"
  | "void.request"
  | "void.approve"
  | "discount.request"
  | "discount.apply"
  | "cash.adjustment"
  | "stock.adjustment"
  | "role.change";

export interface AuditEntry {
  action: AuditAction;
  /** user who performed the action; null for pre-auth/system events */
  actorId?: string | null;
  /** outlet the action touched, when applicable (BR-010) */
  outletId?: string | null;
  /** entity type + id the action targeted, e.g. "order" / ord_123 */
  entity?: string | null;
  entityId?: string | null;
  /** free-form context; objects are JSON-stringified */
  detail?: string | Record<string, unknown> | null;
}

/**
 * Write one audit row. Best-effort: returns true on success, false if the insert
 * failed (already logged). Never throws — auditing must not break the caller.
 */
export async function writeAudit(entry: AuditEntry): Promise<boolean> {
  try {
    const detail =
      entry.detail == null
        ? null
        : typeof entry.detail === "string"
          ? entry.detail
          : JSON.stringify(entry.detail);

    await db.insert(auditLogs).values({
      id: randomUUID(),
      actorId: entry.actorId ?? null,
      outletId: entry.outletId ?? null,
      action: entry.action,
      entity: entry.entity ?? null,
      entityId: entry.entityId ?? null,
      detail,
    });
    return true;
  } catch (err) {
    console.error(`[audit] failed to write "${entry.action}":`, err);
    return false;
  }
}
