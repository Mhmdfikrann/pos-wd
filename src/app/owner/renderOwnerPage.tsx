import { OwnerClient } from "@/app/owner/OwnerClient";
import { DEFAULT_OWNER_LABEL, DEFAULT_OWNER_PATH, ownerTrailForPath } from "@/components/owner/nav";
import { getOwnerReportSnapshots } from "@/lib/reports";
import { requireRoute } from "@/lib/session";

export async function renderOwnerPage(initialActive = DEFAULT_OWNER_LABEL, initialPath = DEFAULT_OWNER_PATH) {
  const session = await requireRoute("/owner");
  const reports = getOwnerReportSnapshots(session.outletIds);

  return (
    <OwnerClient
      userName={session.name}
      reports={reports}
      initialActive={initialActive}
      initialPath={initialPath}
      initialTrail={ownerTrailForPath(initialPath)}
    />
  );
}
