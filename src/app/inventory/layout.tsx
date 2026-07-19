/**
 * Server-side guard for the Inventory screen. Authoritative role check
 * (PRD FR-002): re-validates identity + role before the client shell renders.
 */
import { requireRoute } from "@/lib/session";

export default async function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoute("/inventory");
  return children;
}
