"use client";

import { useState } from "react";
import { ic } from "@/components/owner/icons";
import { Sidebar } from "@/components/owner/Sidebar";
import { Dashboard } from "@/components/owner/Dashboard";
import { TablePage } from "@/components/owner/TablePage";
import { ReportPage } from "@/components/owner/ReportPage";
import { FormPage } from "@/components/owner/FormPage";
import { BoardPage } from "@/components/owner/BoardPage";
import { KasirPage } from "@/components/owner/KasirPage";
import { pageType } from "@/components/owner/nav";

/** Port of `renderPageEl()` — archetype router for the active label. */
function PageEl({ active }: { active: string }) {
  if (active === "Dashboard Penjualan") return null;
  const t = pageType(active);
  let el: React.ReactNode;
  if (t === "report") el = <ReportPage label={active} />;
  else if (t === "form") el = <FormPage label={active} />;
  else if (t === "board") el = <BoardPage label={active} />;
  else if (t === "kasir") el = <KasirPage />;
  else el = <TablePage label={active} />;
  return <div style={{ padding: "22px 26px 32px" }}>{el}</div>;
}

export default function OwnerPage() {
  const [active, setActive] = useState("Dashboard Penjualan");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ Dashboard: true });
  const [period, setPeriod] = useState("Hari ini");

  const toggle = (label: string) => setExpanded((s) => ({ ...s, [label]: !s[label] }));

  const isDashboard = active === "Dashboard Penjualan";

  return (
    <div style={{ height: "100vh", display: "flex", background: "#F5F6F8", color: "#23201F", overflow: "hidden" }}>
      <Sidebar active={active} expanded={expanded} onSelect={setActive} onToggle={toggle} />

      {/* MAIN */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <div
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
          <div style={{ fontSize: "17px", fontWeight: 800 }}>{active}</div>
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
          <div style={{ display: "flex", alignItems: "center", gap: "9px", cursor: "pointer", padding: "3px 4px 3px 3px", borderRadius: "10px" }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                background: "#A91F34",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "13.5px",
              }}
            >
              A
            </div>
            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontSize: "12.5px", fontWeight: 700 }}>Andi Wijaya</div>
              <div style={{ fontSize: "10.5px", color: "rgba(35,32,31,0.5)" }}>Owner</div>
            </div>
            <span style={{ display: "flex", color: "rgba(35,32,31,0.35)", marginLeft: "2px" }}>{ic("chevronDown", 15, "currentColor", 2)}</span>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="wd-scroll" style={{ flex: 1, overflowY: "auto" }}>
          {isDashboard ? <Dashboard period={period} onPeriod={setPeriod} /> : null}
          <PageEl active={active} />
        </div>
      </div>
    </div>
  );
}
