/**
 * Manager Outlet route guard (PRD §6.2). Server component: authoritative role
 * check before the client shell renders. Owner + Manager may enter.
 */
import { requireRoute } from "@/lib/session";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoute("/manager");
  return <>{children}</>;
}
