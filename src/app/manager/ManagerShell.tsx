"use client";

/**
 * Manager Outlet operations shell (PRD §6.2, §8.7).
 *
 * Mock-driven like the other role screens — the point of this phase is the ROUTE
 * + guard + real session identity, not bespoke data wiring. Two surfaces:
 *  - Operations snapshot: shift/cash/kitchen/stock KPIs the manager monitors.
 *  - Approvals inbox: the refund/void/discount/stock-adjustment requests the
 *    manager must approve (§8.7). Approve/reject here is local state until
 *    Phase 8/9 back it with real requests + audit.
 */
import { useState } from "react";
import {
  ShieldCheck,
  ClipboardList,
  Wallet,
  ChefHat,
  Boxes,
  Check,
  X,
  Clock,
} from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { tokens, tones } from "@/lib/tokens";
import { LogoutButton } from "@/components/LogoutButton";

type ApprovalKind = "refund" | "void" | "discount" | "stock";
interface Approval {
  id: string;
  kind: ApprovalKind;
  title: string;
  detail: string;
  amount?: number;
  by: string;
  at: string;
}

const KIND_META: Record<ApprovalKind, { label: string; tone: keyof typeof tones }> = {
  refund: { label: "Refund", tone: "danger" },
  void: { label: "Void", tone: "warn" },
  discount: { label: "Diskon", tone: "gold" },
  stock: { label: "Penyesuaian Stok", tone: "info" },
};

const INITIAL_APPROVALS: Approval[] = [
  { id: "a1", kind: "refund", title: "Refund #TRX-0418", detail: "Pelanggan komplain dimsum dingin — 1 porsi", amount: 22000, by: "Sinta Dewi", at: "10:24" },
  { id: "a2", kind: "void", title: "Void #TRX-0421", detail: "Salah input menu, belum dibayar", by: "Sinta Dewi", at: "10:41" },
  { id: "a3", kind: "discount", title: "Diskon manual 15%", detail: "Pesanan rombongan 12 porsi", amount: 54000, by: "Sinta Dewi", at: "11:02" },
  { id: "a4", kind: "stock", title: "Penyesuaian stok — Kulit Pangsit", detail: "Selisih opname −8 pcs", by: "Dewi Lestari", at: "11:15" },
];

const KPIS = [
  { icon: Wallet, label: "Kas Shift Aktif", value: formatRupiah(2_480_000), sub: "1 shift terbuka", tone: "ok" as const },
  { icon: ClipboardList, label: "Transaksi Hari Ini", value: "37", sub: "+6 vs kemarin", tone: "info" as const },
  { icon: ChefHat, label: "Antrean Dapur", value: "4", sub: "1 melewati SLA", tone: "warn" as const },
  { icon: Boxes, label: "Stok Perlu Restock", value: "3", sub: "2 menipis · 1 habis", tone: "danger" as const },
];

export function ManagerShell({
  name,
  roleLabel,
  outletCount,
}: {
  name: string;
  roleLabel: string;
  outletCount: number;
}) {
  const [approvals, setApprovals] = useState(INITIAL_APPROVALS);
  const [resolved, setResolved] = useState<Record<string, "approved" | "rejected">>({});

  const act = (id: string, decision: "approved" | "rejected") => {
    setResolved((r) => ({ ...r, [id]: decision }));
    // Remove after a beat so the decision is visible, then clears the inbox.
    setTimeout(() => setApprovals((list) => list.filter((a) => a.id !== id)), 900);
  };

  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div style={{ minHeight: "100vh", background: tokens.suite, color: tokens.suiteInk }}>
      {/* Top bar */}
      <header
        style={{
          height: 62,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 26px",
          background: "#fff",
          borderBottom: "1px solid rgba(35,32,31,0.06)",
        }}
      >
        <ShieldCheck size={20} color={tokens.primary} />
        <div style={{ fontSize: 17, fontWeight: 800 }}>Manager Outlet</div>
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
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: tokens.primary,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 13.5,
            }}
          >
            {initials}
          </div>
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>{name}</div>
            <div style={{ fontSize: 10.5, color: "rgba(35,32,31,0.5)" }}>{roleLabel}</div>
          </div>
        </div>
        <LogoutButton />
      </header>

      <main style={{ padding: "22px 26px 40px", maxWidth: 1100, margin: "0 auto" }}>
        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
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
        <section style={{ marginTop: 26 }}>
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
              Tidak ada permintaan yang menunggu. Semua beres. ✨
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {approvals.map((a) => {
                const meta = KIND_META[a.kind];
                const decision = resolved[a.id];
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
                      opacity: decision ? 0.55 : 1,
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
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>{a.title}</div>
                      <div style={{ fontSize: 12, color: "rgba(35,32,31,0.55)", marginTop: 1 }}>{a.detail}</div>
                      <div style={{ fontSize: 11, color: "rgba(35,32,31,0.4)", marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                        <Clock size={11} /> {a.at} · {a.by}
                      </div>
                    </div>
                    {a.amount != null && (
                      <div style={{ fontSize: 14, fontWeight: 800, fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                        {formatRupiah(a.amount)}
                      </div>
                    )}
                    {decision ? (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: decision === "approved" ? tones.ok[1] : tones.danger[1],
                          whiteSpace: "nowrap",
                        }}
                      >
                        {decision === "approved" ? "Disetujui" : "Ditolak"}
                      </span>
                    ) : (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => act(a.id, "rejected")}
                          aria-label="Tolak"
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            border: "1px solid rgba(214,69,69,0.3)",
                            background: "#fff",
                            color: tones.danger[1],
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                          }}
                        >
                          <X size={17} />
                        </button>
                        <button
                          onClick={() => act(a.id, "approved")}
                          aria-label="Setujui"
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
                            cursor: "pointer",
                          }}
                        >
                          <Check size={17} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <p style={{ marginTop: 28, fontSize: 11.5, color: "rgba(35,32,31,0.4)" }}>
          Data contoh · approval nyata + audit menyusul di Fase 8–9. Lihat{" "}
          <code style={{ fontFamily: "var(--font-mono)" }}>docs/phases/phase-09-refund-void-discount.md</code>.
        </p>
      </main>
    </div>
  );
}
