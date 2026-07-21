"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import type { LucideIcon } from "lucide-react";
import {
  BadgePercent,
  Bell,
  CircleHelp,
  Gift,
  History,
  Home,
  MapPin,
  ReceiptText,
  Tag,
  UserCircle,
} from "lucide-react";
import type { logoutCustomerAction, redeemRewardAction } from "@/lib/customer-actions";
import {
  filterCustomerRewards,
  getCustomerTierProgress,
  type CustomerRewardView,
  type RewardFilter,
} from "@/lib/customer-home";
import { formatRupiah } from "@/lib/format";

type Screen = "home" | "rewards" | "promo" | "riwayat" | "akun";

type Member = {
  fullName: string;
  phone: string;
  email: string;
  pointsBalance: number;
  tier: "silver" | "gold";
  card: string;
  visits: number;
  spend: number;
};

type Reward = CustomerRewardView;
type Promo = { id: string; icon: string; off: string; name: string; desc: string; until: string; color: string };
type History = { id: string; type: string; pts: number; name: string; outlet: string; date: string };
type Voucher = { id: string; code: string; status: "active" | "used" | "expired"; statusLabel: string; rewardName: string; category: string; icon: string; issued: string; expires: string };

type Props = {
  member: Member;
  rewards: Reward[];
  promos: Promo[];
  history: History[];
  historySummary: { earned: number; redeemed: number };
  vouchers: Voucher[];
  logoutAction: typeof logoutCustomerAction;
  redeemAction: typeof redeemRewardAction;
};

const TABS: Array<{ id: Screen; label: string; Icon: LucideIcon }> = [
  { id: "home", label: "Beranda", Icon: Home },
  { id: "rewards", label: "Rewards", Icon: Gift },
  { id: "promo", label: "Promo", Icon: BadgePercent },
  { id: "riwayat", label: "Riwayat", Icon: History },
  { id: "akun", label: "Akun", Icon: UserCircle },
];
const REWARD_FILTERS: RewardFilter[] = ["Semua", "Voucher", "Paket", "Gratis", "Ongkir"];

function fmtPoints(n: number) {
  return n.toLocaleString("id-ID");
}

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || "M";
}

function SectionHead({ kicker, title, right }: { kicker: string; title: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14 }}>
      <div>
        <div className="font-mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#A91F34", fontWeight: 600 }}>{kicker}</div>
        <h2 style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 5 }}>{title}</h2>
      </div>
      {right ?? null}
    </div>
  );
}

function MemberCard({ member, compact = false }: { member: Member; compact?: boolean }) {
  const progress = getCustomerTierProgress(member);
  return (
    <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", background: "linear-gradient(130deg,#A91F34,#7F1628)", color: "#fff", padding: 20, boxShadow: "0 24px 44px -24px rgba(127,22,40,0.8)" }}>
      <div style={{ position: "absolute", top: -50, right: -40, width: 190, height: 190, borderRadius: "50%", background: "rgba(255,216,77,0.14)" }} />
      <div style={{ position: "absolute", bottom: -60, left: -30, width: 150, height: 150, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: "0.02em" }}><span style={{ color: "#FFD84D" }}>WANNA</span> REWARDS</div>
          <span style={{ fontSize: 10, fontWeight: 700, background: "rgba(255,216,77,0.22)", color: "#FFD84D", padding: "4px 10px", borderRadius: 999, border: "1px solid rgba(255,216,77,0.4)" }}>⬥ {member.tier.toUpperCase()}</span>
        </div>
        <div style={{ marginTop: 18, fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>Poin kamu</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 2 }}>
          <div className="font-mono" style={{ fontSize: 38, fontWeight: 700, lineHeight: 1, color: "#FFD84D" }}>{fmtPoints(member.pointsBalance)}</div>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.8 }}>poin</div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "rgba(255,255,255,0.75)", fontWeight: 600, marginBottom: 6 }}>
            <span>Menuju {progress.nextTier}</span><span className="font-mono">{fmtPoints(progress.remaining)} lagi</span>
          </div>
          <div style={{ height: 7, borderRadius: 999, background: "rgba(0,0,0,0.25)", overflow: "hidden" }}><div style={{ height: "100%", width: `${progress.percent}%`, borderRadius: 999, background: "linear-gradient(90deg,#FFD84D,#FFB020)" }} /></div>
        </div>
        {compact ? null : <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.15)" }}><div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>Member</div><div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{member.fullName}</div></div><div className="font-mono" style={{ fontSize: 13, letterSpacing: "0.12em", color: "rgba(255,255,255,0.7)" }}>•••• {member.card}</div></div>}
      </div>
    </div>
  );
}

function RewardCard({ reward, points, onRedeem }: { reward: Reward; points: number; onRedeem: (reward: Reward) => void }) {
  const affordable = points >= reward.cost;
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(45,32,34,0.07)", borderRadius: 15, padding: 14, display: "flex", flexDirection: "column", boxShadow: "0 10px 22px -18px rgba(127,22,40,0.4)", opacity: affordable ? 1 : 0.72 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><div style={{ width: 44, height: 44, borderRadius: 12, background: "#FFF4D6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{reward.icon}</div><span style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(45,32,34,0.45)", background: "#F6EFE4", padding: "3px 8px", borderRadius: 999 }}>{reward.category}</span></div>
      <div style={{ fontSize: 14, fontWeight: 800, marginTop: 11, lineHeight: 1.2 }}>{reward.name}</div>
      <div style={{ fontSize: 11.5, color: "rgba(45,32,34,0.55)", marginTop: 2, flex: 1 }}>{reward.sub}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}><div className="font-mono" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 700, color: "#A91F34" }}>⭐ {fmtPoints(reward.cost)}</div><button type="button" disabled={!affordable} aria-label={affordable ? `Tukar ${reward.name}` : `${reward.name} terkunci, poin belum cukup`} onClick={() => onRedeem(reward)} style={{ border: "none", background: affordable ? "#A91F34" : "#E8DED2", color: affordable ? "#fff" : "rgba(45,32,34,0.45)", fontWeight: 800, fontSize: 11.5, padding: "7px 10px", borderRadius: 9, cursor: affordable ? "pointer" : "not-allowed" }}>{affordable ? "Tukar" : "Kurang"}</button></div>
    </div>
  );
}

export function CustomerAppClient({ member, rewards, promos, history, historySummary, vouchers, logoutAction, redeemAction }: Props) {
  const [screen, setScreen] = useState<Screen>("home");
  const [toast, setToast] = useState<string | null>(null);
  const [rewardFilter, setRewardFilter] = useState<RewardFilter>("Semua");
  const [redeemReward, setRedeemReward] = useState<Reward | null>(null);

  const go = (next: Screen) => setScreen(next);
  const showOutlet = () => { setToast("12 outlet buka hari ini"); setTimeout(() => setToast(null), 2600); };
  const affordableRewards = rewards.filter((r) => r.cost <= member.pointsBalance);
  const previewRewards = (affordableRewards.length ? affordableRewards : rewards).slice(0, 4);
  const quickActions: Array<{ label: string; Icon: LucideIcon; onClick: () => void }> = [
    { label: "Tukar Poin", Icon: Gift, onClick: () => go("rewards") },
    { label: "Promo", Icon: Tag, onClick: () => go("promo") },
    { label: "Riwayat", Icon: ReceiptText, onClick: () => go("riwayat") },
    { label: "Outlet", Icon: MapPin, onClick: showOutlet },
  ];

  const home = (
    <div>
      <div style={{ padding: "6px 20px 14px" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><div><div style={{ fontSize: 13, color: "rgba(45,32,34,0.55)", fontWeight: 600 }}>Halo, selamat pagi 👋</div><div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>{member.fullName}</div></div><div style={{ width: 44, height: 44, borderRadius: 14, background: "#A91F34", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, boxShadow: "0 10px 20px -10px rgba(127,22,40,0.7)" }}>{initials(member.fullName)}</div></div></div>
      <div style={{ padding: "0 20px" }}><MemberCard member={member} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, padding: "18px 20px 4px" }}>{quickActions.map(({ Icon, label, onClick }) => <button key={label} type="button" aria-label={label} onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}><div style={{ width: 52, height: 52, borderRadius: 15, background: "#fff", border: "1px solid rgba(45,32,34,0.07)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 18px -12px rgba(127,22,40,0.4)" }}><Icon size={22} strokeWidth={2.2} aria-hidden="true" /></div><div style={{ fontSize: 11, fontWeight: 700, color: "#2D2022" }}>{label}</div></button>)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "16px 20px 4px" }}>{[["Kunjungan", `${member.visits}x`, "#A9791F"], ["Total belanja", formatRupiah(member.spend), "#A91F34"]].map(([t, v, c]) => <div key={t} style={{ background: "#fff", border: "1px solid rgba(45,32,34,0.07)", borderRadius: 14, padding: "14px 16px" }}><div style={{ fontSize: 11, color: "rgba(45,32,34,0.55)", fontWeight: 600 }}>{t}</div><div className="font-mono" style={{ fontSize: 17, fontWeight: 700, color: c, marginTop: 4 }}>{v}</div></div>)}</div>
      <div style={{ padding: "22px 0 4px" }}><div style={{ padding: "0 20px" }}><SectionHead kicker="Promo untukmu" title="Lagi ada apa?" right={<button onClick={() => go("promo")} style={{ fontSize: 11, color: "#A91F34", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}>Lihat semua</button>} /></div><div className="wd-member-hscroll">{promos.slice(0, 3).map((p) => <button key={p.id} type="button" onClick={() => go("promo")} style={{ flex: "0 0 auto", width: 250, scrollSnapAlign: "start", cursor: "pointer", borderRadius: 16, overflow: "hidden", background: p.color, color: "#fff", padding: 18, position: "relative", border: "none", textAlign: "left", fontFamily: "inherit" }}><div style={{ position: "absolute", top: -30, right: -20, width: 110, height: 110, borderRadius: "50%", background: "rgba(255,255,255,0.12)" }} /><div style={{ position: "relative" }}><div style={{ fontSize: 26 }}>{p.icon}</div><span style={{ display: "inline-block", marginTop: 8, background: "rgba(255,255,255,0.2)", fontSize: 10, fontWeight: 800, padding: "4px 9px", borderRadius: 999 }}>{p.off}</span><div style={{ fontSize: 17, fontWeight: 800, marginTop: 8 }}>{p.name}</div><div style={{ fontSize: 11.5, opacity: 0.8, marginTop: 2 }}>Berlaku s/d {p.until}</div></div></button>)}</div></div>
      <div style={{ padding: "18px 20px 12px" }}><SectionHead kicker="Tukar poin" title={affordableRewards.length ? "Bisa kamu tukar sekarang" : "Reward pilihan"} right={<button type="button" onClick={() => go("rewards")} style={{ fontSize: 11, color: "#A91F34", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}>Semua</button>} /><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{previewRewards.map((r) => <RewardCard key={r.id} reward={r} points={member.pointsBalance} onRedeem={setRedeemReward} />)}</div></div>
    </div>
  );

  const title = { home: "", rewards: "Rewards", promo: "Promo", riwayat: "Riwayat", akun: "Akun" }[screen];
  const body = screen === "home" ? home : <MemberScreen screen={screen} member={member} rewards={rewards} rewardFilter={rewardFilter} onRewardFilter={setRewardFilter} promos={promos} history={history} historySummary={historySummary} vouchers={vouchers} logoutAction={logoutAction} onRedeem={setRedeemReward} onToast={setToast} />;

  const desktopHeader = (
    <header style={{ position: "sticky", top: 0, zIndex: 100, background: "#fff", borderBottom: "1px solid rgba(45,32,34,0.08)", height: 72, display: "flex", alignItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 1200, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button type="button" onClick={() => go("home")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: 0 }}>
          <strong style={{ fontSize: 18, fontWeight: 800, color: "#2D2022" }}><span style={{ color: "#A91F34" }}>WANNA</span> REWARDS</strong>
        </button>
        <nav style={{ display: "flex", gap: 28 }}>
          {TABS.map(({ id, label }) => {
            const active = screen === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => go(id)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14.5,
                  fontWeight: active ? 800 : 600,
                  color: active ? "#A91F34" : "rgba(45,32,34,0.6)",
                  padding: "8px 0",
                  position: "relative",
                  fontFamily: "inherit"
                }}
              >
                {label}
                {active && (
                  <span style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "#A91F34", borderRadius: 999 }} />
                )}
              </button>
            );
          })}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="font-mono" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#A91F34", background: "#FFF4D6", padding: "7px 14px", borderRadius: 999 }}>
            ⭐ {fmtPoints(member.pointsBalance)}
          </div>
          <form action={logoutAction}>
            <button type="submit" style={{ background: "none", border: "none", color: "rgba(45,32,34,0.6)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              Logout
            </button>
          </form>
        </div>
      </div>
    </header>
  );

  const desktopBody = (
    <div style={{ minHeight: "calc(100vh - 72px)", background: "#FFF9F2", padding: "40px 0" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px", display: "grid", gridTemplateColumns: "340px 1fr", gap: 40, alignItems: "start" }}>
        
        {/* Left column / Sidebar */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <MemberCard member={member} />
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[["Kunjungan", `${member.visits}x`, "#A9791F"], ["Total belanja", formatRupiah(member.spend), "#A91F34"]].map(([t, v, c]) => (
              <div key={t} style={{ background: "#fff", border: "1px solid rgba(45,32,34,0.07)", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, color: "rgba(45,32,34,0.55)", fontWeight: 600 }}>{t}</div>
                <div className="font-mono" style={{ fontSize: 17, fontWeight: 700, color: c, marginTop: 4 }}>{v}</div>
              </div>
            ))}
          </div>
          
          <div style={{ background: "#fff", border: "1px solid rgba(45,32,34,0.07)", borderRadius: 16, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10, fontSize: 13.5 }}>
            <div><b>Email</b><br /><span style={{ color: "rgba(45,32,34,0.7)" }}>{member.email}</span></div>
            <div><b>Nomor HP</b><br /><span style={{ color: "rgba(45,32,34,0.7)" }}>{member.phone}</span></div>
          </div>
        </aside>
        
        {/* Right column / Main content area */}
        <section style={{ background: "#fff", border: "1px solid rgba(45,32,34,0.07)", borderRadius: 24, padding: 30, boxShadow: "0 10px 30px -15px rgba(0,0,0,0.05)" }}>
          {screen === "home" ? (
            <div>
              {/* Promo section */}
              <div>
                <SectionHead kicker="Promo untukmu" title="Lagi ada apa?" right={<button onClick={() => go("promo")} style={{ fontSize: 11, color: "#A91F34", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}>Lihat semua</button>} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 30 }}>
                  {promos.slice(0, 2).map((p) => (
                    <button key={p.id} type="button" onClick={() => go("promo")} style={{ borderRadius: 16, overflow: "hidden", background: p.color, color: "#fff", padding: 18, position: "relative", border: "none", textAlign: "left", fontFamily: "inherit", cursor: "pointer", width: "100%", height: 160 }}>
                      <div style={{ position: "absolute", top: -30, right: -20, width: 110, height: 110, borderRadius: "50%", background: "rgba(255,255,255,0.12)" }} />
                      <div style={{ position: "relative" }}>
                        <div style={{ fontSize: 26 }}>{p.icon}</div>
                        <span style={{ display: "inline-block", marginTop: 8, background: "rgba(255,255,255,0.2)", fontSize: 10, fontWeight: 800, padding: "4px 9px", borderRadius: 999 }}>{p.off}</span>
                        <div style={{ fontSize: 17, fontWeight: 800, marginTop: 8 }}>{p.name}</div>
                        <div style={{ fontSize: 11.5, opacity: 0.8, marginTop: 2 }}>Berlaku s/d {p.until}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Rewards preview */}
              <div style={{ borderTop: "1px solid rgba(45,32,34,0.08)", paddingTop: 24 }}>
                <SectionHead kicker="Tukar poin" title={affordableRewards.length ? "Bisa kamu tukar sekarang" : "Reward pilihan"} right={<button type="button" onClick={() => go("rewards")} style={{ fontSize: 11, color: "#A91F34", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}>Semua</button>} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                  {previewRewards.slice(0, 3).map((r) => (
                    <RewardCard key={r.id} reward={r} points={member.pointsBalance} onRedeem={setRedeemReward} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ padding: "4px 0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(45,32,34,0.08)", marginBottom: 20 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>{title}</h1>
              </div>
              {body}
            </div>
          )}
        </section>
        
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop View Shell */}
      <div className="wd-member-desktop-shell">
        {desktopHeader}
        {desktopBody}
        {toast ? <div className="wd-toast-container"><span>{toast}</span></div> : null}
        {redeemReward ? <RedeemSheet reward={redeemReward} points={member.pointsBalance} action={redeemAction} onClose={() => setRedeemReward(null)} /> : null}
      </div>

      {/* Mobile View Shell */}
      <div className="wd-member-mobile-shell">
        <main className="wd-member-container" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "26px 12px", background: "radial-gradient(circle at 50% 0%, #F6ECDD, #E4D8C7)" }}>
          <div className="wd-member-phone" style={{ position: "relative", width: 390, height: 844, background: "#111", borderRadius: 52, padding: 11, boxShadow: "0 50px 100px -30px rgba(90,40,20,0.55), 0 0 0 2px rgba(0,0,0,0.35)" }}>
            <div className="wd-member-notch" style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 126, height: 31, background: "#111", borderRadius: "0 0 18px 18px", zIndex: 60 }} />
            <div className="wd-member-content" style={{ position: "relative", width: "100%", height: "100%", background: "#FFF9F2", borderRadius: 42, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div className="wd-member-statusbar" style={{ flexShrink: 0, height: 46, display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 26px 6px", fontSize: 13, fontWeight: 700, zIndex: 40, background: "rgba(255,249,242,0.92)", color: "#2D2022" }}><span className="font-mono">09:41</span><span style={{ letterSpacing: 1 }}>📶 5G 🔋</span></div>
              {screen === "home" ? null : <div style={{ flexShrink: 0, padding: "4px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}><div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>{title}</div><div className="font-mono" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#A91F34", background: "#FFF4D6", padding: "7px 12px", borderRadius: 999 }}>⭐ {fmtPoints(member.pointsBalance)}</div></div>}
              <div className="wd-scroll" style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>{body}</div>
              <TabBar screen={screen} onGo={go} />
              {toast ? <div className="wd-toast-container"><span>{toast}</span></div> : null}
              {redeemReward ? <RedeemSheet reward={redeemReward} points={member.pointsBalance} action={redeemAction} onClose={() => setRedeemReward(null)} /> : null}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

function TabBar({ screen, onGo }: { screen: Screen; onGo: (screen: Screen) => void }) {
  return <nav aria-label="Navigasi member" style={{ flexShrink: 0, display: "flex", padding: "8px 8px calc(8px + env(safe-area-inset-bottom))", background: "rgba(255,249,242,0.95)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(45,32,34,0.08)", boxShadow: "0 -8px 24px -18px rgba(45,32,34,0.3)" }}>{TABS.map(({ id, label, Icon }) => { const on = screen === id; return <button key={id} type="button" aria-label={label} aria-current={on ? "page" : undefined} onClick={() => onGo(id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "6px 0", color: on ? "#A91F34" : "rgba(45,32,34,0.4)", fontFamily: "inherit" }}><Icon size={23} strokeWidth={on ? 2.4 : 1.9} aria-hidden="true" /><span style={{ fontSize: 10, fontWeight: on ? 800 : 600 }}>{label}</span></button>; })}</nav>;
}

function MemberScreen({
  screen,
  member,
  rewards,
  rewardFilter,
  onRewardFilter,
  promos,
  history,
  historySummary,
  vouchers,
  logoutAction,
  onRedeem,
  onToast,
}: {
  screen: Screen;
  member: Member;
  rewards: Reward[];
  rewardFilter: RewardFilter;
  onRewardFilter: (filter: RewardFilter) => void;
  promos: Promo[];
  history: History[];
  historySummary: { earned: number; redeemed: number };
  vouchers: Voucher[];
  logoutAction: typeof logoutCustomerAction;
  onRedeem: (reward: Reward) => void;
  onToast: (message: string | null) => void;
}) {
  if (screen === "rewards") {
    const filteredRewards = filterCustomerRewards(rewards, rewardFilter);
    return <div style={{ padding: "0 20px 16px" }}><MemberCard member={member} compact /><div className="wd-member-hscroll" style={{ paddingLeft: 0, paddingRight: 0, paddingTop: 16, paddingBottom: 14 }}>{REWARD_FILTERS.map((filter) => { const active = filter === rewardFilter; return <button key={filter} type="button" onClick={() => onRewardFilter(filter)} aria-pressed={active} style={{ flex: "0 0 auto", border: `1px solid ${active ? "#A91F34" : "rgba(45,32,34,0.14)"}`, background: active ? "#A91F34" : "#fff", color: active ? "#fff" : "rgba(45,32,34,0.7)", fontWeight: 800, fontSize: 12.5, padding: "8px 15px", borderRadius: 999, cursor: "pointer" }}>{filter}</button>; })}</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{filteredRewards.map((r) => <RewardCard key={r.id} reward={r} points={member.pointsBalance} onRedeem={onRedeem} />)}</div></div>;
  }
  if (screen === "promo") {
    return <div style={{ padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 14 }}>{promos.map((p) => <article key={p.id} style={{ borderRadius: 18, overflow: "hidden", border: "1px solid rgba(45,32,34,0.07)", background: "#fff", boxShadow: "0 14px 30px -24px rgba(127,22,40,0.5)" }}><div style={{ position: "relative", padding: "18px 18px 16px", background: p.color, color: "#fff" }}><div style={{ position: "absolute", top: -24, right: -14, width: 96, height: 96, borderRadius: "50%", background: "rgba(255,255,255,0.12)" }} /><div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}><div style={{ width: 46, height: 46, borderRadius: 13, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{p.icon}</div><div><span style={{ display: "inline-block", background: "#FFD84D", color: "#2D2022", fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 999 }}>{p.off}</span><h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 5 }}>{p.name}</h2></div></div></div><div style={{ padding: "14px 18px 16px" }}><p style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(45,32,34,0.68)" }}>{p.desc}</p><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}><span style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(45,32,34,0.5)" }}>s/d {p.until}</span><button type="button" onClick={() => { onToast("Promo dipakai saat checkout di outlet"); window.setTimeout(() => onToast(null), 2800); }} style={{ border: "none", cursor: "pointer", background: "#2D2022", color: "#fff", fontWeight: 800, fontSize: 12.5, padding: "9px 16px", borderRadius: 10 }}>Info kasir</button></div></div></article>)}</div>;
  }
  if (screen === "riwayat") {
    return <div style={{ padding: "0 20px 16px" }}><SectionHead kicker="Riwayat Poin" title="Aktivitas kamu" /><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "2px 0 18px" }}>{[["Total didapat", `+${fmtPoints(historySummary.earned)}`, "#E4F4EC", "#238152"], ["Total ditukar", `-${fmtPoints(historySummary.redeemed)}`, "#FFF1F2", "#A91F34"]].map(([t, v, bg, c]) => <div key={t} style={{ background: bg, borderRadius: 14, padding: "14px 16px" }}><div style={{ fontSize: 11, color: "rgba(45,32,34,0.6)", fontWeight: 600 }}>{t}</div><div className="font-mono" style={{ fontSize: 19, fontWeight: 700, color: c, marginTop: 3 }}>{v} poin</div></div>)}</div><div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{history.map((h) => { const earn = h.pts >= 0; return <div key={h.id} style={{ background: "#fff", border: "1px solid rgba(45,32,34,0.07)", borderRadius: 14, padding: 14, display: "flex", gap: 12, alignItems: "center" }}><div style={{ width: 40, height: 40, borderRadius: 12, background: earn ? "#E4F4EC" : "#FFF1F2", color: earn ? "#238152" : "#A91F34", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>{earn ? "+" : "-"}</div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.name}</div><div style={{ fontSize: 11.5, color: "rgba(45,32,34,0.55)", marginTop: 2 }}>{h.outlet} · {h.date}</div></div><div className="font-mono" style={{ color: earn ? "#238152" : "#A91F34", fontWeight: 800, fontSize: 13 }}>{earn ? "+" : "-"}{fmtPoints(Math.abs(h.pts))}</div></div>; })}</div></div>;
  }
  return <AccountScreen member={member} vouchers={vouchers} logoutAction={logoutAction} onToast={onToast} />;
}

function AccountScreen({ member, vouchers, logoutAction, onToast }: { member: Member; vouchers: Voucher[]; logoutAction: typeof logoutCustomerAction; onToast: (message: string | null) => void }) {
  const rows: Array<{ Icon: LucideIcon; label: string; value: string; onClick?: () => void }> = [
    { Icon: UserCircle, label: "Data diri", value: member.fullName },
    { Icon: Bell, label: "Notifikasi", value: "Aktif", onClick: () => onToast("Notifikasi promo aktif") },
    { Icon: CircleHelp, label: "Bantuan", value: "Chat outlet", onClick: () => onToast("Hubungi kasir di outlet terdekat") },
  ];
  return <div style={{ padding: "0 20px 16px" }}><div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "4px 0 18px" }}><div style={{ width: 74, height: 74, borderRadius: "50%", background: "linear-gradient(135deg,#A91F34,#7F1628)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 30, boxShadow: "0 14px 28px -14px rgba(127,22,40,0.8)" }}>{initials(member.fullName)}</div><div style={{ fontSize: 19, fontWeight: 800, marginTop: 12 }}>{member.fullName}</div><div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 5, fontSize: 11.5, fontWeight: 700, color: "#A9791F", background: "#FFF4D6", padding: "4px 11px", borderRadius: 999 }}>Member {member.tier.toUpperCase()}</div></div><MemberCard member={member} compact /><section style={{ marginTop: 18 }}><SectionHead kicker="Voucher saya" title={`${vouchers.filter((v) => v.status === "active").length} tersedia`} />{vouchers.length ? <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{vouchers.map((voucher) => <div key={voucher.id} style={{ background: "#fff", border: "1px solid rgba(45,32,34,0.07)", borderRadius: 14, padding: 14 }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}><div style={{ display: "flex", gap: 11, alignItems: "center", minWidth: 0 }}><div style={{ width: 40, height: 40, borderRadius: 12, background: "#FFF4D6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{voucher.icon}</div><div style={{ minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{voucher.rewardName}</div><div className="font-mono" style={{ fontSize: 11.5, color: "#A91F34", fontWeight: 800, marginTop: 2 }}>{voucher.code}</div></div></div><span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 800, color: voucher.status === "active" ? "#238152" : "rgba(45,32,34,0.45)", background: voucher.status === "active" ? "#E4F4EC" : "#F6EFE4", padding: "4px 8px", borderRadius: 999 }}>{voucher.statusLabel}</span></div><div style={{ marginTop: 9, fontSize: 11.5, color: "rgba(45,32,34,0.55)", fontWeight: 700 }}>Berlaku sampai {voucher.expires}</div></div>)}</div> : <div style={{ background: "#fff", border: "1px solid rgba(45,32,34,0.07)", borderRadius: 14, padding: 16, fontSize: 13, color: "rgba(45,32,34,0.62)", fontWeight: 700 }}>Belum ada voucher aktif. Tukar poin untuk membuat voucher baru.</div>}</section><div style={{ background: "#fff", border: "1px solid rgba(45,32,34,0.07)", borderRadius: 16, overflow: "hidden", marginTop: 18 }}>{rows.map(({ Icon, label, value, onClick }, index) => <button key={label} type="button" onClick={onClick} style={{ width: "100%", display: "flex", alignItems: "center", gap: 13, padding: "15px 16px", background: "none", border: "none", borderBottom: index < rows.length - 1 ? "1px solid rgba(45,32,34,0.06)" : "none", cursor: onClick ? "pointer" : "default", textAlign: "left", fontFamily: "inherit" }}><span style={{ width: 34, height: 34, borderRadius: 10, background: "#FFF4D6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={17} aria-hidden="true" /></span><span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "#2D2022" }}>{label}</span><span style={{ fontSize: 12.5, color: "rgba(45,32,34,0.5)", fontWeight: 600 }}>{value}</span></button>)}</div><div style={{ marginTop: 14, background: "#fff", border: "1px solid rgba(45,32,34,0.07)", borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 10, fontSize: 13.5 }}><div><b>Email</b><br />{member.email}</div><div><b>Nomor HP</b><br />{member.phone}</div><form action={logoutAction}><button type="submit" style={{ width: "100%", height: 44, border: "none", borderRadius: 12, background: "#A91F34", color: "#fff", fontWeight: 800, cursor: "pointer" }}>Logout Customer</button></form></div></div>;
}

function RedeemSheet({ reward, points, action, onClose }: { reward: Reward; points: number; action: typeof redeemRewardAction; onClose: () => void }) {
  const [state, formAction] = useActionState(action, null);
  const remaining = points - reward.cost;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="redeem-title" className="wd-redeem-overlay">
      <button type="button" aria-label="Tutup konfirmasi tukar poin" onClick={onClose} style={{ position: "absolute", inset: 0, border: 0, background: "transparent", cursor: "pointer" }} />
      <form action={formAction} className="wd-redeem-form">
        <input type="hidden" name="rewardId" value={reward.id} />
        <div style={{ width: 42, height: 4, borderRadius: 999, background: "rgba(45,32,34,0.18)", margin: "0 auto 18px" }} />
        <div style={{ display: "flex", gap: 13, alignItems: "center" }}>
          <div style={{ width: 54, height: 54, borderRadius: 15, background: "#FFF4D6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>{reward.icon}</div>
          <div>
            <h2 id="redeem-title" style={{ fontSize: 20, fontWeight: 800 }}>{reward.name}</h2>
            <p style={{ marginTop: 3, fontSize: 12.5, color: "rgba(45,32,34,0.58)", fontWeight: 700 }}>{reward.sub}</p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 18 }}>
          {[["Poin dipakai", fmtPoints(reward.cost)], ["Sisa poin", fmtPoints(Math.max(0, remaining))]].map(([label, value]) => (
            <div key={label} style={{ borderRadius: 14, background: "#fff", border: "1px solid rgba(45,32,34,0.07)", padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "rgba(45,32,34,0.55)", fontWeight: 700 }}>{label}</div>
              <div className="font-mono" style={{ fontSize: 17, color: "#A91F34", fontWeight: 800, marginTop: 3 }}>{value}</div>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 14, fontSize: 12.5, lineHeight: 1.5, color: "rgba(45,32,34,0.62)" }}>Voucher berlaku 30 hari dan akan muncul di Voucher saya setelah penukaran berhasil.</p>
        {state ? <div role={state.ok ? "status" : "alert"} aria-live="polite" style={{ marginTop: 14, borderRadius: 13, padding: "11px 12px", fontSize: 12.5, fontWeight: 800, color: state.ok ? "#238152" : "#A91F34", background: state.ok ? "#E4F4EC" : "#FFF1F2" }}>{state.ok ? state.message : state.error}</div> : null}
        <RedeemSubmitButton disabled={remaining < 0 || Boolean(state?.ok)} />
        <button type="button" onClick={onClose} style={{ width: "100%", marginTop: 10, padding: 12, background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 800, color: "rgba(45,32,34,0.55)" }}>{state?.ok ? "Tutup" : "Batal"}</button>
      </form>
    </div>
  );
}

function RedeemSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={disabled || pending} style={{ width: "100%", height: 50, marginTop: 18, border: "none", borderRadius: 14, background: disabled ? "#E8DED2" : "#FFD84D", color: disabled ? "rgba(45,32,34,0.45)" : "#2D2022", fontWeight: 900, fontSize: 15, cursor: disabled || pending ? "not-allowed" : "pointer", boxShadow: disabled ? "none" : "0 16px 30px -16px rgba(233,154,34,0.9)" }}>{pending ? "Memproses..." : disabled ? "Poin belum cukup" : "Konfirmasi Tukar"}</button>;
}
