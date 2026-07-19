"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, PermissionError } from "@/lib/session";
import { transitionKitchenTicket, type KitchenStatus, type KitchenTicketView } from "@/lib/kitchen";
import { KitchenTransitionError } from "@/lib/kitchen-core";

export type ActionResult<T = void> = ({ ok: true } & T) | { ok: false; error: string };

export async function actionTransitionKitchenTicket(input: {
  ticketId: string;
  toStatus: KitchenStatus;
}): Promise<ActionResult<{ ticket: KitchenTicketView }>> {
  try {
    const session = await requirePermission("kitchen.update");
    const ticket = transitionKitchenTicket({
      ticketId: input.ticketId,
      outletIds: session.outletIds,
      actorId: session.userId,
      toStatus: input.toStatus,
    });
    revalidatePath("/kitchen");
    return { ok: true, ticket };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { ok: false, error: "Anda tidak punya izin mengubah status dapur." };
    }
    if (err instanceof KitchenTransitionError) {
      return { ok: false, error: err.message };
    }
    const msg = err instanceof Error ? err.message : String(err);
    if (/ticket|outlet|transisi/i.test(msg)) {
      return { ok: false, error: msg };
    }
    console.error("[kitchen-action] transition failed:", err);
    return { ok: false, error: "Gagal mengubah status ticket dapur." };
  }
}
