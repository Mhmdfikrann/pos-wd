import { OwnerClient } from "@/app/owner/OwnerClient";
import { getOwnerReportSnapshots } from "@/lib/reports";
import { requireRoute } from "@/lib/session";

export default async function OwnerPage() {
  const session = await requireRoute("/owner");
  const reports = getOwnerReportSnapshots(session.outletIds);

  return <OwnerClient userName={session.name} reports={reports} />;
}
