"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { ic } from "./icons";
import { NAV, containsActive, type NavItem } from "./nav";

interface SidebarProps {
  active: string;
  collapsed: boolean;
  expanded: Record<string, boolean>;
  onSelect: (label: string) => void;
  onToggle: (label: string) => void;
  onCollapsedChange: (collapsed: boolean) => void;
}

/** Port of `renderNav()` — leaf + branch with depth indentation and active highlight. */
export function Sidebar({ active, collapsed, expanded, onSelect, onToggle, onCollapsedChange }: SidebarProps) {
  const leaf = (label: string, depth: number) => {
    const isActive = active === label;
    const style: CSSProperties = {
      display: "flex",
      alignItems: "center",
      width: "100%",
      textAlign: "left",
      gap: "10px",
      border: "none",
      cursor: "pointer",
      borderRadius: "9px",
      fontFamily: "inherit",
      fontSize: "12.5px",
      fontWeight: isActive ? 700 : 500,
      padding: depth === 0 ? "9px 12px" : `8px 12px 8px ${16 + depth * 15}px`,
      color: isActive ? "#A91F34" : "rgba(35,32,31,0.6)",
      background: isActive ? "#FFF1F2" : "transparent",
      transition: "all .12s",
    };
    return (
      <button
        key={label}
        onClick={() => onSelect(label)}
        style={style}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.background = "#FAFAFA";
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.background = "transparent";
        }}
      >
        {depth > 0 ? (
          <span
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: isActive ? "#A91F34" : "rgba(35,32,31,0.22)",
              flexShrink: 0,
            }}
          />
        ) : null}
        {label}
      </button>
    );
  };

  const railItem = (item: NavItem) => {
    const anyActive = containsActive(item, active);
    const Icon = item.ic ? ic(item.ic, 18, anyActive ? "#A91F34" : "rgba(35,32,31,0.55)", 2) : null;
    return (
      <button
        key={item.label}
        type="button"
        aria-label={item.label}
        title={item.label}
        onClick={() => {
          if (item.children) {
            onCollapsedChange(false);
            if (!expanded[item.label]) onToggle(item.label);
            return;
          }
          onSelect(item.label);
        }}
        style={{
          width: "42px",
          height: "42px",
          border: "none",
          borderRadius: "11px",
          background: anyActive ? "#FFF1F2" : "transparent",
          color: anyActive ? "#A91F34" : "rgba(35,32,31,0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "background .12s, color .12s",
        }}
        onMouseEnter={(e) => {
          if (!anyActive) e.currentTarget.style.background = "#FAFAFA";
        }}
        onMouseLeave={(e) => {
          if (!anyActive) e.currentTarget.style.background = "transparent";
        }}
      >
        {Icon}
      </button>
    );
  };

  const branch = (item: NavItem, depth: number) => {
    const open = !!expanded[item.label];
    const anyActive = containsActive(item, active);
    const headerStyle: CSSProperties = {
      display: "flex",
      alignItems: "center",
      width: "100%",
      textAlign: "left",
      gap: "10px",
      border: "none",
      cursor: "pointer",
      borderRadius: "9px",
      fontFamily: "inherit",
      fontSize: depth === 0 ? "12.5px" : "12px",
      fontWeight: 600,
      padding: depth === 0 ? "9px 12px" : `8px 12px 8px ${16 + depth * 15}px`,
      color: anyActive ? "#A91F34" : "rgba(35,32,31,0.75)",
      background: "transparent",
      transition: "all .12s",
    };
    return (
      <div key={item.label}>
        <button
          onClick={() => onToggle(item.label)}
          style={headerStyle}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#FAFAFA")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          {depth === 0 ? (
            <span style={{ display: "flex", width: "20px", justifyContent: "center", flexShrink: 0 }}>
              {ic(item.ic!, 17, anyActive ? "#A91F34" : "rgba(35,32,31,0.5)")}
            </span>
          ) : null}
          <span style={{ flex: 1 }}>{item.label}</span>
          <span
            style={{
              display: "flex",
              color: "rgba(35,32,31,0.35)",
              transform: open ? "rotate(90deg)" : "none",
              transition: "transform .15s",
            }}
          >
            {ic("chevron", 13, "currentColor", 2.2)}
          </span>
        </button>
        {open ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1px", marginTop: "1px", marginBottom: "2px" }}>
            {item.children!.map((c) => (c.children ? branch(c, depth + 1) : leaf(c.label, depth + 1)))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div
      className={`wd-owner-sidebar ${collapsed ? "wd-collapsed-sidebar wd-sidebar-collapsed" : "wd-sidebar-expanded"}`}
      style={{
        width: collapsed ? "64px" : "256px",
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
          height: "62px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: "10px",
          padding: collapsed ? "0" : "0 12px 0 18px",
          borderBottom: "1px solid rgba(35,32,31,0.06)",
        }}
      >
        <button
          type="button"
          aria-label={collapsed ? "Buka sidebar" : "Tutup sidebar"}
          aria-expanded={!collapsed}
          onClick={() => onCollapsedChange(!collapsed)}
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            background: "#fff",
            border: "1px solid rgba(35,32,31,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            cursor: "pointer",
            color: "#A91F34",
          }}
          title={collapsed ? "Buka sidebar" : "Tutup sidebar"}
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
            <div style={{ fontSize: "13.5px", fontWeight: 800, whiteSpace: "nowrap" }}>
              <span style={{ color: "#A91F34" }}>WANNA</span> DIMSUM
            </div>
            <div style={{ fontSize: "10px", color: "rgba(35,32,31,0.45)", fontWeight: 600, marginTop: "2px" }}>Business Suite</div>
          </div>
        )}
      </div>
      <div className="wd-scroll" style={{ flex: 1, overflowY: "auto", padding: collapsed ? "10px 10px 20px" : "10px 10px 20px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: collapsed ? "center" : "stretch", gap: collapsed ? "4px" : "2px" }}>
          {collapsed ? NAV.map(railItem) : NAV.map((item) => (item.children ? branch(item, 0) : leaf(item.label, 0)))}
        </div>
      </div>
    </div>
  );
}
