"use client";

/**
 * Manager Outlet operations shell (PRD §6.2, §8.7).
 *
 * Mock-driven like the other role screens — the point of this phase is the ROUTE
 * + guard + real session identity, not bespoke data wiring. Two surfaces:
 *  - Operations snapshot: shift/cash/kitchen/stock KPIs the manager monitors.
 *  - Approvals inbox: the refund/void/discount/stock-adjustment requests the
 *    manager must approve (§8.7).
 */
import Image from "next/image";
import { useState } from "react";
import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ShieldCheck,
  ClipboardList,
  Wallet,
  ChefHat,
  Boxes,
  Check,
  Clock,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { tokens, tones } from "@/lib/tokens";
import {
  actionApproveRequest,
  actionRequestManualDiscount,
  actionRequestRefund,
  actionRequestVoid,
} from "@/lib/finance-actions";
import type { ApprovalKind, ApprovalRequestView, FinanceOrderView } from "@/lib/finance-data";
import { RoleProfileMenu } from "@/components/RoleProfileMenu";

const KIND_META: Record<ApprovalKind, { label: string; tone: keyof typeof tones }> = {
  refund: { label: "Refund", tone: "danger" },
  void: { label: "Void", tone: "warn" },
  discount: { label: "Diskon", tone: "gold" },
};

const KPIS = [
  { icon: Wallet, label: "Kas Shift Aktif", value: formatRupiah(2_480_000), sub: "1 shift terbuka", tone: "ok" as const },
  { icon: ClipboardList, label: "Transaksi Hari Ini", value: "37", sub: "+6 vs kemarin", tone: "info" as const },
  { icon: ChefHat, label: "Antrean Dapur", value: "4", sub: "1 melewati SLA", tone: "warn" as const },
  { icon: Boxes, label: "Stok Perlu Restock", value: "3", sub: "2 menipis · 1 habis", tone: "danger" as const },
];

type ManagerSection = "overview" | "approvals" | "transactions";

const MANAGER_NAV: Array<{ id: ManagerSection; label: string; icon: LucideIcon; target: string }> = [
  { id: "overview", label: "Ringkasan", icon: ShieldCheck, target: "manager-overview" },
  { id: "approvals", label: "Persetujuan", icon: ClipboardList, target: "manager-approvals" },
  { id: "transactions", label: "Transaksi", icon: Clock, target: "manager-transactions" },
];

function ManagerSidebar({
  active,
  collapsed,
  onActive,
  onCollapsedChange,
}: {
  active: ManagerSection;
  collapsed: boolean;
  onActive: (section: ManagerSection) => void;
  onCollapsedChange: (collapsed: boolean) => void;
}) {
  const navButton = (item: (typeof MANAGER_NAV)[number]) => {
    const Icon = item.icon;
    const selected = active === item.id;
    const style: CSSProperties = {
      height: collapsed ? 42 : 40,
      width: collapsed ? 42 : "100%",
      border: "none",
      borderRadius: 11,
      background: selected ? "#FFF1F2" : "transparent",
      color: selected ? tokens.primary : "rgba(35,32,31,0.62)",
      display: "flex",
      alignItems: "center",
      justifyContent: collapsed ? "center" : "flex-start",
      gap: 10,
      padding: collapsed ? 0 : "0 12px",
      fontFamily: "inherit",
      fontSize: 12.5,
      fontWeight: selected ? 800 : 650,
      cursor: "pointer",
      transition: "background .12s, color .12s",
    };

    return (
      <button
        key={item.id}
        type="button"
        aria-label={item.label}
        title={item.label}
        onClick={() => {
          onActive(item.id);
          document.getElementById(item.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        style={style}
        onMouseEnter={(e) => {
          if (!selected) e.currentTarget.style.background = "#FAFAFA";
        }}
        onMouseLeave={(e) => {
          if (!selected) e.currentTarget.style.background = "transparent";
        }}
      >
        <Icon size={18} strokeWidth={2.1} />
        {collapsed ? null : <span>{item.label}</span>}
      </button>
    );
  };

  return (
    <aside
      className={`wd-manager-sidebar ${collapsed ? "wd-collapsed-sidebar wd-sidebar-collapsed" : "wd-sidebar-expanded"}`}
      style={{
        width: collapsed ? 64 : 228,
        flexShrink: 0,
        background: "#fff",
        borderRight: "1px solid rgba(35,32,31,0.07)",
        display: "flex",
        flexDirection: "column",
        transition: "width .18s ease",
      }}
    >
      <div
        style={{
          height: 62,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 10,
          padding: collapsed ? 0 : "0 12px 0 18px",
          borderBottom: "1px solid rgba(35,32,31,0.06)",
        }}
      >
        <button
          type="button"
          aria-label={collapsed ? "Buka sidebar" : "Tutup sidebar"}
          aria-expanded={!collapsed}
          title={collapsed ? "Buka sidebar" : "Tutup sidebar"}
          onClick={() => onCollapsedChange(!collapsed)}
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            border: "1px solid rgba(35,32,31,0.08)",
            background: "#fff",
            color: tokens.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            overflow: "hidden",
          }}
        >
          {collapsed ? (
            <span className="wd-collapsed-logo-toggle" style={{ display: "grid", placeItems: "center", width: "100%", height: "100%" }}>
              <Image className="wd-collapsed-logo-img" src="/logo-icon.jpg" alt="" width={34} height={34} style={{ objectFit: "contain" }} />
              <span className="wd-collapsed-logo-icon" aria-hidden="true" style={{ display: "none", lineHeight: 0 }}>
                <PanelLeftOpen size={18} strokeWidth={2.2} />
              </span>
            </span>
          ) : (
            <PanelLeftClose size={18} strokeWidth={2.2} />
          )}
        </button>
        {collapsed ? null : (
          <div style={{ lineHeight: 1.05, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, whiteSpace: "nowrap" }}>
              <span style={{ color: tokens.primary }}>MANAGER</span> POS
            </div>
            <div style={{ fontSize: 10, color: "rgba(35,32,31,0.45)", fontWeight: 650, marginTop: 2 }}>Outlet Control</div>
          </div>
        )}
      </div>
      <nav
        aria-label="Navigasi manager"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: collapsed ? "center" : "stretch",
          gap: collapsed ? 4 : 3,
          padding: "10px",
        }}
      >
        {MANAGER_NAV.map(navButton)}
      </nav>
    </aside>
  );
}

export function ManagerShell({
  name,
  roleLabel,
  outletCount,
  initialApprovals,
  orders,
}: {
  name: string;
  roleLabel: string;
  outletCount: number;
  initialApprovals: ApprovalRequestView[];
  orders: FinanceOrderView[];
}) {
  const [approvals, setApprovals] = useState(initialApprovals);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [requestBusyId, setRequestBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState<ManagerSection>("overview");

  const approve = async (request: ApprovalRequestView) => {
    if (busyId) return;
    setBusyId(request.id);
    setNotice(null);
    const res = await actionApproveRequest({ requestId: request.id, kind: request.kind });
    setBusyId(null);
    if (!res.ok) {
      setNotice(res.error);
      return;
    }
    setApprovals((list) => list.filter((item) => item.id !== request.id));
    setNotice("Approval disetujui.");
  };

  const requestAction = async (order: FinanceOrderView, kind: ApprovalKind) => {
    if (requestBusyId) return;
    const reason = window.prompt("Alasan request");
    if (!reason) return;
    let amount = 0;
    if (kind === "refund" || kind === "discount") {
      const raw = window.prompt(kind === "refund" ? "Nominal refund" : "Nominal diskon");
      amount = Number((raw ?? "").replace(/\D/g, ""));
      if (!amount) return;
    }
    setRequestBusyId(`${order.id}:${kind}`);
    setNotice(null);
    const res =
      kind === "refund"
        ? await actionRequestRefund({ orderId: order.id, amount, reason })
        : kind === "void"
          ? await actionRequestVoid({ orderId: order.id, reason })
          : await actionRequestManualDiscount({ orderId: order.id, amount, reason });
    setRequestBusyId(null);
    if (!res.ok) {
      setNotice(res.error);
      return;
    }
    setApprovals((list) => [res.request, ...list]);
    setNotice("Request approval dibuat.");
  };

  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="wd-manager-shell" style={{ height: "100vh", display: "flex", overflow: "hidden", background: tokens.suite, color: tokens.suiteInk }}>
      <ManagerSidebar
        active={activeSection}
        collapsed={sidebarCollapsed}
        onActive={setActiveSection}
        onCollapsedChange={setSidebarCollapsed}
      />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <header
          className="wd-role-topbar wd-manager-topbar"
          style={{
            height: 62,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "0 26px",
            background: "#fff",
            borderBottom: "1px solid rgba(35,32,31,0.06)",
          }}
        >
          <div style={{ flex: 1 }} />
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              fontSize: 12,
              fontWeight: 700,
              padding: "8px 12px",
              borderRadius: 9,
              background: "#EDF7F1",
              color: "#238152",
            }}
          >
            <span className="wd-blink" style={{ width: 8, height: 8, borderRadius: "50%", background: "#2E9D64" }} />
            {outletCount} outlet
          </span>
          <div style={{ width: 1, height: 26, background: "rgba(35,32,31,0.1)" }} />
          <RoleProfileMenu
            name={name}
            roleLabel={roleLabel}
            initials={initials || "M"}
            onProfile={() => document.getElementById("manager-overview")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            onSettings={() => document.getElementById("manager-approvals")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          />
        </header>

        <main className="wd-scroll wd-manager-content" style={{ flex: 1, overflowY: "auto", padding: "22px 26px 40px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* KPIs */}
        <div id="manager-overview" className="wd-manager-overview-grid" style={{ scrollMarginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {KPIS.map(({ icon: Icon, label, value, sub, tone }) => (
            <div
              key={label}
              style={{
                background: "#fff",
                border: "1px solid rgba(35,32,31,0.06)",
                borderRadius: 16,
                padding: "16px 18px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: tones[tone][0],
                    color: tones[tone][1],
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon size={19} />
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "rgba(35,32,31,0.55)" }}>{label}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 12, fontFamily: "var(--font-mono)" }}>{value}</div>
              <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)", marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Approvals inbox */}
        <section id="manager-approvals" style={{ marginTop: 26, scrollMarginTop: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800 }}>Menunggu Persetujuan</h2>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                padding: "3px 9px",
                borderRadius: 999,
                background: approvals.length ? tones.danger[0] : tones.ok[0],
                color: approvals.length ? tones.danger[1] : tones.ok[1],
              }}
            >
              {approvals.length}
            </span>
          </div>

          {approvals.length === 0 ? (
            <div
              style={{
                background: "#fff",
                border: "1px dashed rgba(35,32,31,0.15)",
                borderRadius: 16,
                padding: "40px 20px",
                textAlign: "center",
                color: "rgba(35,32,31,0.45)",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Tidak ada permintaan yang menunggu.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {approvals.map((a) => {
                const meta = KIND_META[a.kind];
                return (
                  <div
                    key={a.id}
                    style={{
                      background: "#fff",
                      border: "1px solid rgba(35,32,31,0.07)",
                      borderRadius: 14,
                      padding: "14px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      opacity: busyId === a.id ? 0.55 : 1,
                      transition: "opacity 0.2s",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 800,
                        padding: "4px 9px",
                        borderRadius: 7,
                        background: tones[meta.tone][0],
                        color: tones[meta.tone][1],
                        whiteSpace: "nowrap",
                      }}
                    >
                      {meta.label}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                        {meta.label} #{a.orderNo}
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(35,32,31,0.55)", marginTop: 1 }}>{a.reason}</div>
                      <div style={{ fontSize: 11, color: "rgba(35,32,31,0.4)", marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                        <Clock size={11} /> {new Date(a.createdAt).toLocaleString("id-ID")} · {a.requestedById}
                      </div>
                    </div>
                    {a.amount != null && (
                      <div style={{ fontSize: 14, fontWeight: 800, fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                        {formatRupiah(a.amount)}
                      </div>
                    )}
                    <button
                      onClick={() => void approve(a)}
                      aria-label="Setujui"
                      disabled={busyId === a.id}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        border: "none",
                        background: tokens.success,
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: busyId === a.id ? "wait" : "pointer",
                      }}
                    >
                      <Check size={17} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {notice ? (
          <div
            role="alert"
            style={{
              marginTop: 16,
              background: notice.includes("Gagal") || notice.includes("tidak") ? "#FBE7E7" : "#EDF7F1",
              color: notice.includes("Gagal") || notice.includes("tidak") ? "#B83636" : "#238152",
              borderRadius: 10,
              padding: "10px 13px",
              fontSize: 12.5,
              fontWeight: 700,
            }}
          >
            {notice}
          </div>
        ) : null}

        <section id="manager-transactions" style={{ marginTop: 26, scrollMarginTop: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800 }}>Histori Transaksi</h2>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                padding: "3px 9px",
                borderRadius: 999,
                background: tones.info[0],
                color: tones.info[1],
              }}
            >
              {orders.length}
            </span>
          </div>

          <div className="wd-responsive-table" style={{ background: "#fff", border: "1px solid rgba(35,32,31,0.07)", borderRadius: 14, overflow: "hidden" }}>
            {orders.length === 0 ? (
              <div style={{ padding: 24, color: "rgba(35,32,31,0.45)", fontSize: 13, fontWeight: 600 }}>
                Belum ada transaksi pada outlet ini.
              </div>
            ) : (
              orders.map((order) => {
                const disabled = order.status !== "paid";
                return (
                  <div
                    key={order.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr .8fr .9fr 1fr auto",
                      gap: 12,
                      alignItems: "center",
                      padding: "13px 16px",
                      borderTop: "1px solid rgba(35,32,31,0.06)",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 800 }}>{order.orderNo}</div>
                      <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.45)", marginTop: 2 }}>
                        {new Date(order.createdAt).toLocaleString("id-ID")}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: order.status === "paid" ? tones.ok[1] : tones.warn[1] }}>
                      {order.status}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 800 }}>
                      {formatRupiah(order.total)}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(35,32,31,0.55)" }}>
                      Refund {formatRupiah(order.refundedAmount)} · Diskon {formatRupiah(order.discountAmount)}
                    </div>
                    <div style={{ display: "flex", gap: 7 }}>
                      {(["refund", "void", "discount"] as ApprovalKind[]).map((kind) => (
                        <button
                          key={kind}
                          onClick={() => void requestAction(order, kind)}
                          disabled={disabled || requestBusyId === `${order.id}:${kind}`}
                          style={{
                            height: 32,
                            border: "1px solid rgba(35,32,31,0.1)",
                            borderRadius: 8,
                            background: disabled ? "rgba(35,32,31,0.06)" : "#fff",
                            color: disabled ? "rgba(35,32,31,0.35)" : tokens.suiteInk,
                            fontFamily: "inherit",
                            fontSize: 11.5,
                            fontWeight: 800,
                            padding: "0 9px",
                            cursor: disabled ? "not-allowed" : "pointer",
                          }}
                        >
                          {KIND_META[kind].label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
          </div>
        </main>
      </div>
    </div>
  );
}
