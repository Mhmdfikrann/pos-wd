"use server";

import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { InventoryError, type ManualMovementType } from "@/lib/inventory-core";
import { adjustStock, type StockView } from "@/lib/inventory";
import {
  assertOutletAccess,
  OutletScopeError,
  PermissionError,
  requirePermission,
} from "@/lib/session";

export type ActionResult<T = void> = ({ ok: true } & T) | { ok: false; error: string };

export async function actionAdjustStock(input: {
  outletId: string;
  itemId: string;
  type: ManualMovementType;
  quantity: number;
  note?: string | null;
}): Promise<ActionResult<{ item: StockView }>> {
  try {
    const session = await requirePermission("inventory.adjust");
    assertOutletAccess(session, input.outletId);

    const item = adjustStock({
      outletId: input.outletId,
      itemId: input.itemId,
      type: input.type,
      quantity: input.quantity,
      actorId: session.userId,
      note: input.note ?? null,
    });

    await writeAudit({
      action: "stock.adjustment",
      actorId: session.userId,
      outletId: input.outletId,
      entity: "inventory_item",
      entityId: input.itemId,
      detail: {
        type: input.type,
        quantity: input.quantity,
        resultingQuantity: item.qty,
      },
    });

    revalidatePath("/inventory");
    return { ok: true, item };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { ok: false, error: "Anda tidak punya izin menyesuaikan stok." };
    }
    if (err instanceof OutletScopeError) {
      return { ok: false, error: "Outlet di luar akses Anda." };
    }
    if (err instanceof InventoryError) {
      return { ok: false, error: err.message };
    }
    const msg = err instanceof Error ? err.message : String(err);
    if (/stok|outlet|jumlah/i.test(msg)) {
      return { ok: false, error: msg };
    }
    console.error("[inventory-action] adjust failed:", err);
    return { ok: false, error: "Gagal menyimpan penyesuaian stok." };
  }
}
