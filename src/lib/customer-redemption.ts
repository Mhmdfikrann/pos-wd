import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
  customerMembers,
  customerPointEvents,
  customerRewards,
  customerVouchers,
} from "@/db/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CustomerRedemptionDb = BetterSQLite3Database<any>;

export interface RedeemCustomerRewardInput {
  memberId: string;
  rewardId: string;
  now?: Date;
  makeId?: () => string;
  makeEventId?: () => string;
  makeCode?: () => string;
}

export interface RedeemCustomerRewardResult {
  voucherId: string;
  code: string;
  pointsBalance: number;
  pointsSpent: number;
  expiresAt: string;
}

const VOUCHER_TTL_DAYS = 30;

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function defaultVoucherCode() {
  return `WD-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export function redeemCustomerReward(
  db: CustomerRedemptionDb,
  input: RedeemCustomerRewardInput,
): RedeemCustomerRewardResult {
  const now = input.now ?? new Date();
  const issuedAt = now.toISOString();
  const expiresAt = addDays(now, VOUCHER_TTL_DAYS).toISOString();
  const makeId = input.makeId ?? randomUUID;
  const makeEventId = input.makeEventId ?? randomUUID;
  const makeCode = input.makeCode ?? defaultVoucherCode;

  return db.transaction((tx) => {
    const member = tx
      .select({
        id: customerMembers.id,
        pointsBalance: customerMembers.pointsBalance,
      })
      .from(customerMembers)
      .where(eq(customerMembers.id, input.memberId))
      .get();
    if (!member) throw new Error("Member tidak ditemukan.");

    const reward = tx
      .select({
        id: customerRewards.id,
        name: customerRewards.name,
        pointsCost: customerRewards.pointsCost,
      })
      .from(customerRewards)
      .where(and(eq(customerRewards.id, input.rewardId), eq(customerRewards.active, true)))
      .get();
    if (!reward) throw new Error("Reward tidak ditemukan atau sudah tidak aktif.");
    if (member.pointsBalance < reward.pointsCost) {
      throw new Error("Poin belum cukup untuk menukar reward ini.");
    }

    const voucherId = makeId();
    const eventId = makeEventId();
    const code = makeCode();
    const pointsBalance = member.pointsBalance - reward.pointsCost;

    tx.update(customerMembers)
      .set({ pointsBalance })
      .where(eq(customerMembers.id, member.id))
      .run();
    tx.insert(customerVouchers)
      .values({
        id: voucherId,
        memberId: member.id,
        rewardId: reward.id,
        code,
        status: "active",
        issuedAt,
        expiresAt,
      })
      .run();
    tx.insert(customerPointEvents)
      .values({
        id: eventId,
        memberId: member.id,
        kind: "redeem",
        points: -reward.pointsCost,
        sourceVoucherId: voucherId,
        note: `Tukar ${reward.name}`,
      })
      .run();

    return {
      voucherId,
      code,
      pointsBalance,
      pointsSpent: reward.pointsCost,
      expiresAt,
    };
  });
}
