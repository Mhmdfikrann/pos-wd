import { NextRequest, NextResponse } from "next/server";
import { getAppSession, loadPermissions, scopedOutletIds, OutletScopeError } from "@/lib/session";
import { listKitchenTickets, type KitchenStationFilter } from "@/lib/kitchen";

export const dynamic = "force-dynamic";

const STATIONS = new Set<KitchenStationFilter>(["all", "kukus", "goreng", "minuman"]);

export async function GET(request: NextRequest) {
  const session = await getAppSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const perms = await loadPermissions(session.roleId);
  if (!perms.includes("kitchen.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stationParam = request.nextUrl.searchParams.get("station") ?? "all";
  const station: KitchenStationFilter = STATIONS.has(stationParam as KitchenStationFilter)
    ? (stationParam as KitchenStationFilter)
    : "all";

  try {
    const outletIds = scopedOutletIds(session, request.nextUrl.searchParams.get("outletId"));
    const tickets = listKitchenTickets({ outletIds, station });
    return NextResponse.json(
      { tickets },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (err) {
    if (err instanceof OutletScopeError) {
      return NextResponse.json({ error: "Outlet di luar akses Anda." }, { status: 403 });
    }
    console.error("[kitchen-api] list tickets failed:", err);
    return NextResponse.json({ error: "Gagal memuat ticket dapur." }, { status: 500 });
  }
}
