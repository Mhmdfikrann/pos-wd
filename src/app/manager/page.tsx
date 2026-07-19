/**
 * Manager Outlet home (PRD §6.2, §8.7). Server component: pulls the real session
 * identity + outlet scope, then renders the client shell. Data is mock-driven for
 * now (consistent with the other screens); the approvals inbox surfaces the
 * Manager-gated actions — refund/void/discount/stock-adjustment — that Phase 9
 * will wire to real requests.
 */
import { requireRoute } from "@/lib/session";
import { ROLE_LABEL } from "@/lib/rbac";
import { ManagerShell } from "./ManagerShell";

export default async function ManagerPage() {
  const session = await requireRoute("/manager");
  return (
    <ManagerShell
      name={session.name}
      roleLabel={ROLE_LABEL[session.roleId]}
      outletCount={session.outletIds.length}
    />
  );
}
