import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  customerPointEvents,
  customerPromos,
  customerRewards,
  customerVouchers,
} from "@/db/schema";
import { logoutCustomerAction, redeemRewardAction } from "@/lib/customer-actions";
import { buildCustomerHomeModel } from "@/lib/customer-home";
import { requireCustomerSession } from "@/lib/customer-session";
import { CustomerAppClient } from "./CustomerAppClient";

export default async function MemberPage() {
  const session = await requireCustomerSession();

  const [rewardsRows, promosRows, pointRows, vouchersRows] = await Promise.all([
    db
      .select({
        id: customerRewards.id,
        category: customerRewards.category,
        name: customerRewards.name,
        description: customerRewards.description,
        pointsCost: customerRewards.pointsCost,
      })
      .from(customerRewards)
      .where(eq(customerRewards.active, true))
      .all(),
    db
      .select({
        id: customerPromos.id,
        title: customerPromos.title,
        description: customerPromos.description,
        badge: customerPromos.badge,
        endsAt: customerPromos.endsAt,
      })
      .from(customerPromos)
      .where(eq(customerPromos.active, true))
      .all(),
    db
      .select({
        id: customerPointEvents.id,
        kind: customerPointEvents.kind,
        points: customerPointEvents.points,
        note: customerPointEvents.note,
        createdAt: customerPointEvents.createdAt,
      })
      .from(customerPointEvents)
      .where(eq(customerPointEvents.memberId, session.memberId))
      .orderBy(desc(customerPointEvents.createdAt))
      .limit(30)
      .all(),
    db
      .select({
        id: customerVouchers.id,
        code: customerVouchers.code,
        status: customerVouchers.status,
        issuedAt: customerVouchers.issuedAt,
        expiresAt: customerVouchers.expiresAt,
        rewardName: customerRewards.name,
        rewardCategory: customerRewards.category,
      })
      .from(customerVouchers)
      .leftJoin(customerRewards, eq(customerVouchers.rewardId, customerRewards.id))
      .where(eq(customerVouchers.memberId, session.memberId))
      .orderBy(desc(customerVouchers.issuedAt))
      .all(),
  ]);

  const model = buildCustomerHomeModel({
    session,
    rewardsRows,
    promosRows,
    pointRows,
    vouchersRows,
  });

  return (
    <CustomerAppClient
      member={model.member}
      rewards={model.rewards}
      promos={model.promos}
      history={model.history}
      historySummary={model.historySummary}
      vouchers={model.vouchers}
      logoutAction={logoutCustomerAction}
      redeemAction={redeemRewardAction}
    />
  );
}
