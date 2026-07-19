/**
 * Server-side guard for the Kasir POS. Authoritative role check (PRD FR-002):
 * re-validates identity + role against the DB before the client shell renders.
 */
import { requireRoute } from "@/lib/session";

export default async function KasirLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoute("/kasir");
  return children;
}
