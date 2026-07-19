/**
 * Outlet reads (Phase 4). Small server-only helper the POS uses to resolve the
 * names of the outlets a cashier is assigned to (for the open-shift picker).
 *
 * Outlet scope itself is enforced by `outlet-scope.ts` off the session's
 * `outletIds`; this only turns those ids into display rows. Never import from a
 * client component.
 */
import "server-only";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { outlets } from "@/db/schema";

export interface OutletRef {
  id: string;
  name: string;
  code: string;
  taxPercent: number;
}

/** Active outlets among the given ids, in name order. Empty ids → empty list. */
export async function listOutlets(ids: string[]): Promise<OutletRef[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select({
      id: outlets.id,
      name: outlets.name,
      code: outlets.code,
      taxPercent: outlets.taxPercent,
      active: outlets.active,
    })
    .from(outlets)
    .where(inArray(outlets.id, ids))
    .all();
  return rows
    .filter((r) => r.active)
    .map((r) => ({ id: r.id, name: r.name, code: r.code, taxPercent: r.taxPercent }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
