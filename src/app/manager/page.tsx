/**
 * Manager Outlet home (PRD §6.2, §8.7). Server component: pulls the real session
 * identity + outlet scope, then renders the client shell. Phase 9 wires the
 * approvals inbox and transaction history to the real DB.
 */
import { requireRoute } from "@/lib/session";
import { ROLE_LABEL } from "@/lib/rbac";
import { listApprovalRequests, listFinanceOrders } from "@/lib/finance";
import { ManagerShell } from "./ManagerShell";

export default async function ManagerPage() {
  const session = await requireRoute("/manager");
  const [approvals, orders] = await Promise.all([
    listApprovalRequests({ outletIds: session.outletIds }),
    listFinanceOrders({ outletIds: session.outletIds, limit: 12 }),
  ]);
  return (
    <ManagerShell
      name={session.name}
      roleLabel={ROLE_LABEL[session.roleId]}
      outletCount={session.outletIds.length}
      initialApprovals={approvals}
      orders={orders}
    />
  );
}
