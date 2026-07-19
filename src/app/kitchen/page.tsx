import KitchenClient from "./KitchenClient";
import { requireRoute } from "@/lib/session";
import { listKitchenTickets } from "@/lib/kitchen";
import { listOutlets } from "@/lib/outlets";

export default async function KitchenPage() {
  const session = await requireRoute("/kitchen");
  const [tickets, outlets] = await Promise.all([
    listKitchenTickets({ outletIds: session.outletIds }),
    listOutlets(session.outletIds),
  ]);

  const outletName =
    outlets.length === 0
      ? "Outlet"
      : outlets.length === 1
        ? outlets[0].name
        : `${outlets.length} outlet`;

  return (
    <KitchenClient
      initialTickets={tickets}
      outletName={outletName}
      staffName={session.name}
    />
  );
}
