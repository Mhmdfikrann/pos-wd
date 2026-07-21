export type CustomerTier = "silver" | "gold";
export type RewardCategory = "voucher" | "paket" | "gratis" | "ongkir";

export interface CustomerHomeSession {
  memberId: string;
  fullName: string;
  phone: string;
  email: string;
  pointsBalance: number;
  tier: CustomerTier;
}

export interface CustomerRewardRow {
  id: string;
  category: RewardCategory;
  name: string;
  description: string | null;
  pointsCost: number;
}

export interface CustomerPromoRow {
  id: string;
  title: string;
  description: string;
  badge: string | null;
  endsAt: string | null;
}

export interface CustomerPointRow {
  id: string;
  kind: string;
  points: number;
  note: string | null;
  createdAt: string;
}

export interface CustomerVoucherRow {
  id: string;
  code: string;
  status: "active" | "used" | "expired";
  issuedAt: string;
  expiresAt: string;
  rewardName: string | null;
  rewardCategory: RewardCategory | null;
}

export type CustomerRewardView = {
  id: string;
  category: RewardCategory;
  icon: string;
  name: string;
  sub: string;
  cost: number;
};

export type RewardFilter = "Semua" | "Voucher" | "Paket" | "Gratis" | "Ongkir";

const rewardIcons: Record<RewardCategory, string> = {
  voucher: "🎟️",
  paket: "🥟",
  gratis: "🧋",
  ongkir: "🛵",
};

const promoPalette = ["#A91F34", "#A9791F", "#3A5BB0", "#238152"];
const promoIcons = ["🥟", "👨‍👩‍👧", "⚡", "🛵"];
const rewardFilterCategory: Record<Exclude<RewardFilter, "Semua">, RewardCategory> = {
  Voucher: "voucher",
  Paket: "paket",
  Gratis: "gratis",
  Ongkir: "ongkir",
};

export function getCustomerTierProgress(member: {
  tier: CustomerTier;
  pointsBalance: number;
}) {
  const nextAt = member.tier === "gold" ? 10000 : 5000;
  return {
    nextAt,
    nextTier: member.tier === "gold" ? "Gold+" : "Gold",
    percent: Math.min(100, Math.round((member.pointsBalance / nextAt) * 100)),
    remaining: Math.max(0, nextAt - member.pointsBalance),
  };
}

export function shortCustomerCard(phone: string) {
  return phone.slice(-4).padStart(4, "0");
}

export function formatCustomerHistoryDate(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Baru";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

export function filterCustomerRewards(rewards: CustomerRewardView[], filter: RewardFilter) {
  if (filter === "Semua") return rewards;
  return rewards.filter((reward) => reward.category === rewardFilterCategory[filter]);
}

export function buildCustomerHomeModel({
  session,
  rewardsRows,
  promosRows,
  pointRows,
  vouchersRows = [],
}: {
  session: CustomerHomeSession;
  rewardsRows: CustomerRewardRow[];
  promosRows: CustomerPromoRow[];
  pointRows: CustomerPointRow[];
  vouchersRows?: CustomerVoucherRow[];
}) {
  const rewards: CustomerRewardView[] = rewardsRows.map((row) => ({
    id: row.id,
    category: row.category,
    icon: rewardIcons[row.category],
    name: row.name,
    sub: row.description ?? "Reward Wanna Rewards",
    cost: row.pointsCost,
  }));

  const promos = promosRows.map((row, index) => ({
    id: row.id,
    icon: promoIcons[index % promoIcons.length],
    off: row.badge ?? "PROMO",
    name: row.title,
    desc: row.description,
    until: row.endsAt ? formatCustomerHistoryDate(row.endsAt) : index === 1 ? "Tiap bulan" : "31 Jul",
    color: promoPalette[index % promoPalette.length],
  }));

  const history = pointRows.map((row) => ({
    id: row.id,
    type: row.kind,
    pts: row.points,
    name: row.note ?? (row.points >= 0 ? "Poin belanja" : "Tukar reward"),
    outlet: row.kind === "redeem" ? "App" : "WD Kemang",
    date: formatCustomerHistoryDate(row.createdAt),
  }));

  const historySummary = pointRows.reduce(
    (summary, row) => {
      if (row.points >= 0) summary.earned += row.points;
      if (row.points < 0) summary.redeemed += Math.abs(row.points);
      return summary;
    },
    { earned: 0, redeemed: 0 },
  );

  const vouchers = vouchersRows.map((row) => ({
    id: row.id,
    code: row.code,
    status: row.status,
    statusLabel: row.status === "active" ? "Aktif" : row.status === "used" ? "Terpakai" : "Kedaluwarsa",
    rewardName: row.rewardName ?? "Voucher Wanna Rewards",
    category: row.rewardCategory ?? "voucher",
    icon: row.rewardCategory ? rewardIcons[row.rewardCategory] : rewardIcons.voucher,
    issued: formatCustomerHistoryDate(row.issuedAt),
    expires: formatCustomerHistoryDate(row.expiresAt),
  }));

  return {
    member: {
      fullName: session.fullName,
      phone: session.phone,
      email: session.email,
      pointsBalance: session.pointsBalance,
      tier: session.tier,
      card: shortCustomerCard(session.phone),
      visits: Math.max(1, pointRows.filter((row) => row.points > 0).length * 7),
      spend: Math.max(0, session.pointsBalance * 1000),
    },
    rewards,
    promos,
    history,
    historySummary,
    vouchers,
  };
}
