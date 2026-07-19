/**
 * Server-side guard for the Kitchen Display. Authoritative role check
 * (PRD FR-002): re-validates identity + role before the client shell renders.
 */
import { requireRoute } from "@/lib/session";

export default async function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoute("/kitchen");
  return children;
}
