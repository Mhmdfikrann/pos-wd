/**
 * Launch health checks (Phase 12).
 *
 * A small server/CLI utility for production smoke checks. It verifies the
 * SQLite database file is reachable, passes integrity_check, and contains the
 * domain tables required for the POS to serve live traffic.
 */
import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export const REQUIRED_LAUNCH_TABLES = [
  "users",
  "roles",
  "permissions",
  "outlets",
  "user_outlets",
  "categories",
  "products",
  "inventory_items",
  "outlet_stock",
  "shifts",
  "orders",
  "order_items",
  "payments",
  "kitchen_tickets",
  "stock_movements",
  "approval_requests",
  "audit_logs",
] as const;

export type LaunchHealthStatus =
  | "ok"
  | "missing_database"
  | "integrity_failed"
  | "missing_tables"
  | "error";

export interface LaunchHealth {
  ok: boolean;
  status: LaunchHealthStatus;
  checkedAt: string;
  integrity: string | null;
  missingTables: string[];
  tableCount: number;
  error?: string;
}

export function checkLaunchHealth(
  databasePath: string,
  requiredTables: readonly string[] = REQUIRED_LAUNCH_TABLES,
): LaunchHealth {
  const checkedAt = new Date().toISOString();
  const resolvedPath = resolve(databasePath);

  if (!existsSync(resolvedPath)) {
    return {
      ok: false,
      status: "missing_database",
      checkedAt,
      integrity: null,
      missingTables: [...requiredTables],
      tableCount: 0,
      error: "Database tidak ditemukan.",
    };
  }

  let db: Database.Database | null = null;
  try {
    db = new Database(resolvedPath, { readonly: true, fileMustExist: true });
    const integrity = db.pragma("integrity_check", { simple: true }) as string;
    if (integrity !== "ok") {
      return {
        ok: false,
        status: "integrity_failed",
        checkedAt,
        integrity,
        missingTables: [],
        tableCount: 0,
        error: `SQLite integrity_check gagal: ${integrity}`,
      };
    }

    const tables = db
      .prepare("select name from sqlite_master where type = 'table' and name not like 'sqlite_%'")
      .all() as Array<{ name: string }>;
    const names = new Set(tables.map((table) => table.name));
    const missingTables = requiredTables.filter((table) => !names.has(table));
    if (missingTables.length > 0) {
      return {
        ok: false,
        status: "missing_tables",
        checkedAt,
        integrity,
        missingTables,
        tableCount: tables.length,
        error: `Tabel wajib belum ada: ${missingTables.join(", ")}`,
      };
    }

    return {
      ok: true,
      status: "ok",
      checkedAt,
      integrity,
      missingTables: [],
      tableCount: tables.length,
    };
  } catch (err) {
    return {
      ok: false,
      status: "error",
      checkedAt,
      integrity: null,
      missingTables: [],
      tableCount: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    db?.close();
  }
}
