"use server";

import { db } from "@/db";
import { buildOwnerReport, type OwnerReportSnapshot, type ReportsDb } from "@/lib/reports-data";
import { requireRoute } from "@/lib/session";

export interface OwnerReportDatePart {
  year: number;
  month: number;
  day: number;
}

export async function actionGetOwnerReportForRange(input: {
  start: OwnerReportDatePart;
  end: OwnerReportDatePart;
}): Promise<OwnerReportSnapshot> {
  const session = await requireRoute("/owner");
  const from = jakartaMidnightUtc(input.start).toISOString();
  const to = addDays(jakartaMidnightUtc(input.end), 1).toISOString();

  return buildOwnerReport(db as ReportsDb, {
    outletIds: session.outletIds,
    from,
    to,
  });
}

function jakartaMidnightUtc(date: OwnerReportDatePart): Date {
  return new Date(Date.UTC(date.year, date.month - 1, date.day, -7, 0, 0, 0));
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
