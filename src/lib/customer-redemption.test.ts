import { beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import {
  customerMembers,
  customerPointEvents,
  customerRewards,
  customerVouchers,
} from "@/db/schema";
import { redeemCustomerReward, type CustomerRedemptionDb } from "./customer-redemption";

let db: CustomerRedemptionDb;

function seed() {
  db.insert(customerMembers)
    .values({
      id: "member_1",
      fullName: "Budi Santoso",
      phone: "6281234567890",
      email: "budi@example.com",
      termsAcceptedAt: "2026-07-01T00:00:00.000Z",
      privacyAcceptedAt: "2026-07-01T00:00:00.000Z",
      pointsBalance: 1000,
      tier: "silver",
    })
    .run();
  db.insert(customerRewards)
    .values([
      {
        id: "reward_ok",
        name: "Voucher Rp20.000",
        category: "voucher",
        pointsCost: 900,
        description: "Potongan belanja",
      },
      {
        id: "reward_locked",
        name: "Paket Keluarga",
        category: "paket",
        pointsCost: 2000,
        description: "Kurang poin",
      },
    ])
    .run();
}

beforeEach(() => {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  db = drizzle(sqlite) as BetterSQLite3Database<Record<string, never>> as CustomerRedemptionDb;
  migrate(db as never, { migrationsFolder: "./drizzle" });
  seed();
});

describe("customer reward redemption", () => {
  it("deducts points, creates a 30-day voucher, and records redeem history", () => {
    const result = redeemCustomerReward(db, {
      memberId: "member_1",
      rewardId: "reward_ok",
      now: new Date("2026-07-21T10:00:00.000Z"),
      makeId: () => "voucher_1",
      makeEventId: () => "event_1",
      makeCode: () => "WD-TEST-0001",
    });

    expect(result).toEqual({
      voucherId: "voucher_1",
      code: "WD-TEST-0001",
      pointsBalance: 100,
      pointsSpent: 900,
      expiresAt: "2026-08-20T10:00:00.000Z",
    });
    expect(db.select().from(customerMembers).where(eq(customerMembers.id, "member_1")).get()?.pointsBalance).toBe(100);
    expect(db.select().from(customerVouchers).where(eq(customerVouchers.id, "voucher_1")).get()).toMatchObject({
      memberId: "member_1",
      rewardId: "reward_ok",
      code: "WD-TEST-0001",
      status: "active",
      issuedAt: "2026-07-21T10:00:00.000Z",
      expiresAt: "2026-08-20T10:00:00.000Z",
    });
    expect(db.select().from(customerPointEvents).where(eq(customerPointEvents.id, "event_1")).get()).toMatchObject({
      memberId: "member_1",
      kind: "redeem",
      points: -900,
      sourceVoucherId: "voucher_1",
      note: "Tukar Voucher Rp20.000",
    });
  });

  it("rejects locked rewards without mutating balance, vouchers, or history", () => {
    expect(() =>
      redeemCustomerReward(db, {
        memberId: "member_1",
        rewardId: "reward_locked",
        now: new Date("2026-07-21T10:00:00.000Z"),
        makeId: () => "voucher_locked",
        makeEventId: () => "event_locked",
        makeCode: () => "WD-LOCKED",
      }),
    ).toThrow("Poin belum cukup untuk menukar reward ini.");

    expect(db.select().from(customerMembers).where(eq(customerMembers.id, "member_1")).get()?.pointsBalance).toBe(1000);
    expect(db.select().from(customerVouchers).all()).toHaveLength(0);
    expect(db.select().from(customerPointEvents).all()).toHaveLength(0);
  });
});
