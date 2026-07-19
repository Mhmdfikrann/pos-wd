import InventoryClient from "./InventoryClient";
import { listStock } from "@/lib/inventory";
import { listOutlets } from "@/lib/outlets";
import { requireRoute } from "@/lib/session";

export default async function InventoryPage() {
  const session = await requireRoute("/inventory");
  const [items, outlets] = await Promise.all([
    listStock({ outletIds: session.outletIds }),
    listOutlets(session.outletIds),
  ]);

  const outletName =
    outlets.length === 0
      ? "Outlet"
      : outlets.length === 1
        ? outlets[0].name
        : `${outlets.length} outlet`;

  return (
    <InventoryClient
      initialItems={items}
      outletName={outletName}
      staffName={session.name}
    />
  );
}
