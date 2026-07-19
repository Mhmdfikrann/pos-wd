import { NextResponse } from "next/server";
import { checkLaunchHealth } from "@/lib/health";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = checkLaunchHealth(env.DATABASE_URL);
  return NextResponse.json(
    {
      ok: health.ok,
      status: health.status,
      checkedAt: health.checkedAt,
      integrity: health.integrity,
      missingTables: health.missingTables,
      tableCount: health.tableCount,
      error: health.error,
    },
    {
      status: health.ok ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
