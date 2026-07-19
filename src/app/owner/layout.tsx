/**
 * Server-side guard for the Owner suite. Authoritative role check (PRD FR-002):
 * middleware only does a cookie-existence redirect, so identity + role are
 * re-validated here against the DB before the client shell renders.
 */
import { requireRoute } from "@/lib/session";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoute("/owner");
  return children;
}
