import { describe, expect, it } from "vitest";
import {
  buildCustomerHomeModel,
  filterCustomerRewards,
  getCustomerTierProgress,
} from "./customer-home";

describe("customer home model", () => {
  const session = {
    memberId: "cust_1",
    fullName: "Budi Santoso",
    phone: "6281234567890",
    email: "budi@example.com",
    pointsBalance: 3820,
    tier: "silver" as const,
  };

  it("maps DB rows into the member dashboard props", () => {
    const model = buildCustomerHomeModel({
      session,
      rewardsRows: [
        { id: "r1", category: "gratis" as const, name: "Gratis Hakau", description: "1 porsi", pointsCost: 500 },
        { id: "r2", category: "paket" as const, name: "Paket Keluarga", description: null, pointsCost: 6000 },
      ],
      promosRows: [
        { id: "p1", title: "Member Day", description: "Double poin", badge: "2x Poin", endsAt: "2026-07-31T00:00:00.000Z" },
      ],
      pointRows: [
        { id: "e1", kind: "earn", points: 145, note: "Poin belanja", createdAt: "2026-07-20T10:00:00.000Z" },
        { id: "e2", kind: "redeem", points: -500, note: null, createdAt: "bad-date" },
      ],
      vouchersRows: [
        {
          id: "v1",
          code: "WD-HAKAU-2481",
          status: "active" as const,
          issuedAt: "2026-07-21T10:00:00.000Z",
          expiresAt: "2026-08-20T10:00:00.000Z",
          rewardName: "Gratis Hakau",
          rewardCategory: "gratis" as const,
        },
      ],
    });

    expect(model.member).toMatchObject({
      fullName: "Budi Santoso",
      card: "7890",
      pointsBalance: 3820,
      visits: 7,
      spend: 3820000,
    });
    expect(model.rewards[0]).toMatchObject({ icon: "🧋", sub: "1 porsi", cost: 500 });
    expect(model.rewards[1]).toMatchObject({ sub: "Reward Wanna Rewards" });
    expect(model.promos[0]).toMatchObject({ icon: "🥟", off: "2x Poin", name: "Member Day", until: "31 Jul" });
    expect(model.history[1]).toMatchObject({ name: "Tukar reward", outlet: "App", date: "Baru" });
    expect(model.historySummary).toEqual({ earned: 145, redeemed: 500 });
    expect(model.vouchers[0]).toMatchObject({
      code: "WD-HAKAU-2481",
      rewardName: "Gratis Hakau",
      statusLabel: "Aktif",
      expires: "20 Agu",
    });
  });

  it("filters rewards by customer-facing category", () => {
    const rewards = [
      { id: "r1", category: "voucher" as const, icon: "🎟️", name: "Voucher", sub: "Potongan", cost: 900 },
      { id: "r2", category: "gratis" as const, icon: "🧋", name: "Gratis", sub: "Minuman", cost: 500 },
    ];

    expect(filterCustomerRewards(rewards, "Semua")).toHaveLength(2);
    expect(filterCustomerRewards(rewards, "Gratis")).toEqual([rewards[1]]);
  });

  it("calculates tier progress for silver and gold members", () => {
    expect(getCustomerTierProgress({ tier: "silver", pointsBalance: 3820 })).toEqual({
      nextAt: 5000,
      nextTier: "Gold",
      percent: 76,
      remaining: 1180,
    });
    expect(getCustomerTierProgress({ tier: "gold", pointsBalance: 12000 })).toEqual({
      nextAt: 10000,
      nextTier: "Gold+",
      percent: 100,
      remaining: 0,
    });
  });
});
