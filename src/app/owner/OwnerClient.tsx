"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { OnlinePricingManager } from "@/components/owner/OnlinePricingManager";
import { RawMaterialManager } from "@/components/owner/RawMaterialManager";
import { PurchaseManager, PURCHASE_LABELS } from "@/components/owner/PurchaseManager";
import { defaultDateRange, type DateRangeValue } from "@/components/DateRangeFilter";
import { actionGetOwnerReportForRange } from "@/lib/report-actions";
import { RoleProfileMenu } from "@/components/RoleProfileMenu";
import { DEFAULT_OWNER_PATH, ownerExpandedForLabel, ownerPathForLabel, ownerTrailForPath, pageTypeForTrail } from "@/components/owner/nav";
import type { OwnerReportSnapshot } from "@/lib/reports-data";

type OwnerReportSnapshots = Record<"Hari ini" | "Minggu ini" | "Bulan ini", OwnerReportSnapshot>;

/** Port of `renderPageEl()` — archetype router for the active label. */
function PageEl({
  active,
  report,
  dateRange,
  onDateRange,
  activeTrail,
}: {
  active: string;
  report: OwnerReportSnapshot;
  dateRange: DateRangeValue;
  onDateRange: (range: DateRangeValue) => void;
  activeTrail: string[];
}) {
  if (active === "Dashboard Penjualan") return null;
  let el: React.ReactNode;
  if (active === "Harga Ojek Online") {
    el = <OnlinePricingManager />;
  } else if (active === "Daftar Bahan Baku") {
    el = <RawMaterialManager />;
  } else if (PURCHASE_LABELS.includes(active)) {
    el = <PurchaseManager key={active} label={active} />;
  } else if (CATALOG_LABELS.includes(active)) {
    // Bespoke, DB-backed catalog manager (Phase 3) instead of the mock table.
    // key={active} remounts it per label so it opens on the right tab.
    el = <CatalogManager key={active} label={active} />;
  } else {
    const t = pageTypeForTrail(active, activeTrail);
    if (t === "report") el = <ReportPage label={active} report={report} dateRange={dateRange} onDateRange={onDateRange} crumbPath={activeTrail} />;
    else if (t === "form") el = <FormPage label={active} crumbPath={activeTrail} />;
    else if (t === "board") el = <BoardPage label={active} crumbPath={activeTrail} />;
    else if (t === "kasir") el = <KasirPage />;
    else el = <TablePage label={active} crumbPath={activeTrail} />;
  }
  return <div className="wd-owner-page-pad" style={{ padding: "22px 26px 32px" }}>{el}</div>;
}

interface OwnerClientProps {
  userName: string;
  reports: OwnerReportSnapshots;
  initialActive?: string;
  initialPath?: string;
  initialTrail?: string[];
}

export function OwnerClient({ userName, reports, initialActive = "Dashboard Penjualan", initialPath = DEFAULT_OWNER_PATH, initialTrail }: OwnerClientProps) {
  const router = useRouter();
  const [active, setActive] = useState(initialActive);
  const [activePath, setActivePath] = useState(initialPath);
  const [activeTrail, setActiveTrail] = useState<string[]>(() => initialTrail ?? ownerTrailForPath(initialPath));
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => ownerExpandedForLabel(initialActive));
  const [dateRange, setDateRange] = useState<DateRangeValue>(() => defaultDateRange());
  const [selectedReport, setSelectedReport] = useState<OwnerReportSnapshot>(() => reports["Hari ini"]);
  const [reportLoading, setReportLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggle = (label: string) => setExpanded((s) => ({ ...s, [label]: !s[label] }));
  const selectOwnerPage = (label: string, path = ownerPathForLabel(label), trail = ownerTrailForPath(path)) => {
    setActive(label);
    setActivePath(path);
    setActiveTrail(trail);
    setExpanded((current) => ({ ...current, ...ownerExpandedForLabel(label) }));
    router.push(path);
  };

  const isDashboard = active === "Dashboard Penjualan";
  const currentReport = selectedReport;
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleDateRange = async (range: DateRangeValue) => {
    setDateRange(range);
    setReportLoading(true);
    try {
      const nextReport = await actionGetOwnerReportForRange({
        start: { year: range.start.year, month: range.start.month, day: range.start.day },
        end: { year: range.end.year, month: range.end.month, day: range.end.day },
      });
      setSelectedReport(nextReport);
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="wd-owner-shell" style={{ height: "100vh", display: "flex", background: "#F5F6F8", color: "#23201F", overflow: "hidden" }}>
      <Sidebar
        activePath={activePath}
        collapsed={mobileSidebarOpen ? false : sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        expanded={expanded}
        onSelect={selectOwnerPage}
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
            onProfile={() => selectOwnerPage("Informasi Akun")}
            onSettings={() => selectOwnerPage("Informasi Bisnis")}
          />
        </div>

        {/* Scrollable content */}
        <div className="wd-scroll wd-owner-content" style={{ flex: 1, overflowY: "auto" }}>
          {isDashboard ? (
            <Dashboard
              report={currentReport}
              userName={userName}
              dateRange={dateRange}
              onDateRange={handleDateRange}
            />
          ) : null}
          {reportLoading ? (
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 20,
                margin: "10px 26px 0",
                padding: "9px 12px",
                borderRadius: 10,
                background: "#FFF4D6",
                color: "#A9791F",
                fontSize: 12.5,
                fontWeight: 800,
              }}
            >
              Memuat laporan sesuai tanggal...
            </div>
          ) : null}
          <PageEl active={active} report={currentReport} dateRange={dateRange} onDateRange={handleDateRange} activeTrail={activeTrail} />
        </div>
      </div>
    </div>
  );
}
