"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { ic } from "@/components/owner/icons";
import { Sidebar } from "@/components/owner/Sidebar";
import { Dashboard } from "@/components/owner/Dashboard";
import { TablePage } from "@/components/owner/TablePage";
import { ReportPage } from "@/components/owner/ReportPage";
import { FormPage } from "@/components/owner/FormPage";
import { BoardPage } from "@/components/owner/BoardPage";
import { KasirPage } from "@/components/owner/KasirPage";
import { CatalogManager, CATALOG_LABELS } from "@/components/owner/CatalogManager";
import { RoleProfileMenu } from "@/components/RoleProfileMenu";
import { pageType } from "@/components/owner/nav";
import type { OwnerReportSnapshot } from "@/lib/reports-data";

const OWNER_REPORT_PERIODS = ["Hari ini", "Minggu ini", "Bulan ini"] as const;
type OwnerReportPeriod = (typeof OWNER_REPORT_PERIODS)[number];
type OwnerReportSnapshots = Record<OwnerReportPeriod, OwnerReportSnapshot>;

/** Port of `renderPageEl()` — archetype router for the active label. */
function PageEl({ active, report }: { active: string; report: OwnerReportSnapshot }) {
  if (active === "Dashboard Penjualan") return null;
  let el: React.ReactNode;
  if (CATALOG_LABELS.includes(active)) {
    // Bespoke, DB-backed catalog manager (Phase 3) instead of the mock table.
    // key={active} remounts it per label so it opens on the right tab.
    el = <CatalogManager key={active} label={active} />;
  } else {
    const t = pageType(active);
    if (t === "report") el = <ReportPage label={active} report={report} />;
    else if (t === "form") el = <FormPage label={active} />;
    else if (t === "board") el = <BoardPage label={active} />;
    else if (t === "kasir") el = <KasirPage />;
    else el = <TablePage label={active} />;
  }
  return <div className="wd-owner-page-pad" style={{ padding: "22px 26px 32px" }}>{el}</div>;
}

interface OwnerClientProps {
  userName: string;
  reports: OwnerReportSnapshots;
}

export function OwnerClient({ userName, reports }: OwnerClientProps) {
  const [active, setActive] = useState("Dashboard Penjualan");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ Dashboard: true });
  const [period, setPeriod] = useState<OwnerReportPeriod>("Hari ini");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggle = (label: string) => setExpanded((s) => ({ ...s, [label]: !s[label] }));

  const isDashboard = active === "Dashboard Penjualan";
  const currentReport = reports[period] ?? reports["Hari ini"];
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="wd-owner-shell" style={{ height: "100vh", display: "flex", background: "#F5F6F8", color: "#23201F", overflow: "hidden" }}>
      <Sidebar
        active={active}
        collapsed={mobileSidebarOpen ? false : sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        expanded={expanded}
        onSelect={setActive}
        onToggle={toggle}
        onCollapsedChange={setSidebarCollapsed}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      <button
        type="button"
        className={`wd-mobile-sidebar-backdrop ${mobileSidebarOpen ? "wd-mobile-sidebar-backdrop-open" : ""}`}
        aria-label="Tutup sidebar"
        onClick={() => setMobileSidebarOpen(false)}
      />

      {/* MAIN */}
      <div className="wd-owner-main" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <div
          className="wd-role-topbar wd-owner-topbar"
          style={{
            height: "62px",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "0 26px",
            background: "#fff",
            borderBottom: "1px solid rgba(35,32,31,0.06)",
          }}
        >
          <button
            type="button"
            className="wd-mobile-sidebar-trigger"
            aria-label="Buka sidebar"
            aria-expanded={mobileSidebarOpen}
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Menu size={20} strokeWidth={2.4} />
          </button>
          <div style={{ flex: 1 }} />
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              fontSize: "12px",
              fontWeight: 700,
              padding: "8px 12px",
              borderRadius: "9px",
              background: "#EDF7F1",
              color: "#238152",
            }}
          >
            <span className="wd-blink" style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#2E9D64" }} />
            Online
          </span>
          <div
            style={{
              position: "relative",
              width: "38px",
              height: "38px",
              border: "1px solid rgba(35,32,31,0.12)",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            {ic("bell", 17, "rgba(35,32,31,0.6)")}
            <span
              style={{
                position: "absolute",
                top: "-4px",
                right: "-4px",
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: "#A91F34",
                color: "#fff",
                fontSize: "9px",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              3
            </span>
          </div>
          <div style={{ width: "1px", height: "26px", background: "rgba(35,32,31,0.1)" }} />
          <RoleProfileMenu
            name={userName}
            roleLabel="Owner"
            initials={initials || "O"}
            onProfile={() => setActive("Informasi Akun")}
            onSettings={() => setActive("Informasi Bisnis")}
          />
        </div>

        {/* Scrollable content */}
        <div className="wd-scroll wd-owner-content" style={{ flex: 1, overflowY: "auto" }}>
          {isDashboard ? (
            <Dashboard
              period={period}
              periods={[...OWNER_REPORT_PERIODS]}
              report={currentReport}
              userName={userName}
              onPeriod={(next) => setPeriod(next as OwnerReportPeriod)}
            />
          ) : null}
          <PageEl active={active} report={currentReport} />
        </div>
      </div>
    </div>
  );
}
