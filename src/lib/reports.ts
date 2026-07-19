/**
 * Server-only Owner report wrapper (Phase 10).
 *
 * Binds the DB-parameterized report service to the app DB and centralizes the
 * dashboard periods used by the Owner shell.
 */
import "server-only";
import { db } from "@/db";
import {
  buildOwnerReport,
  type OwnerReportSnapshot,
  type ReportsDb,
} from "@/lib/reports-data";

export type { OwnerReportSnapshot } from "@/lib/reports-data";

export const OWNER_REPORT_PERIODS = ["Hari ini", "Minggu ini", "Bulan ini"] as const;
export type OwnerReportPeriod = (typeof OWNER_REPORT_PERIODS)[number];

export type OwnerReportSnapshots = Record<OwnerReportPeriod, OwnerReportSnapshot>;

export function getOwnerReportSnapshots(outletIds: string[], now = new Date()): OwnerReportSnapshots {
  return Object.fromEntries(
    OWNER_REPORT_PERIODS.map((period) => {
      const range = rangeForPeriod(period, now);
      return [
        period,
        buildOwnerReport(db as ReportsDb, {
          outletIds,
          from: range.from,
          to: range.to,
        }),
      ];
    }),
  ) as OwnerReportSnapshots;
}

function rangeForPeriod(period: OwnerReportPeriod, now: Date): { from: string; to: string } {
  const today = jakartaDateParts(now);
  const todayStart = jakartaMidnightUtc(today.year, today.month, today.day);
  const tomorrowStart = addDays(todayStart, 1);

  if (period === "Hari ini") {
    return { from: todayStart.toISOString(), to: tomorrowStart.toISOString() };
  }

  if (period === "Minggu ini") {
    return { from: addDays(todayStart, -6).toISOString(), to: tomorrowStart.toISOString() };
  }

  const monthStart = jakartaMidnightUtc(today.year, today.month, 1);
  const nextMonthStart =
    today.month === 12
      ? jakartaMidnightUtc(today.year + 1, 1, 1)
      : jakartaMidnightUtc(today.year, today.month + 1, 1);
  return { from: monthStart.toISOString(), to: nextMonthStart.toISOString() };
}

function jakartaDateParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function jakartaMidnightUtc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, -7, 0, 0, 0));
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
