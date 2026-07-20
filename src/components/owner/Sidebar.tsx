"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { ic } from "./icons";
import { NAV, ownerPathContains, ownerPathForTrail, type NavItem } from "./nav";

interface SidebarProps {
  activePath: string;
  collapsed: boolean;
  mobileOpen?: boolean;
  expanded: Record<string, boolean>;
  onSelect: (label: string, path: string, trail: string[]) => void;
  onToggle: (label: string) => void;
  onCollapsedChange: (collapsed: boolean) => void;
  onMobileClose?: () => void;
}

/** Port of `renderNav()` — leaf + branch with depth indentation and active highlight. */
export function Sidebar({ activePath, collapsed, mobileOpen = false, expanded, onSelect, onToggle, onCollapsedChange, onMobileClose }: SidebarProps) {
  const leaf = (label: string, depth: number, trail: string[]) => {
    const path = ownerPathForTrail(trail);
    const isActive = activePath === path;
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
        onClick={() => {
          onSelect(label, path, trail);
          onMobileClose?.();
        }}
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
    const path = ownerPathForTrail([item.label]);
    const anyActive = ownerPathContains(activePath, path);
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
          onSelect(item.label, path, [item.label]);
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

  const branch = (item: NavItem, depth: number, trail: string[]) => {
    const open = !!expanded[item.label];
    const path = ownerPathForTrail(trail);
    const anyActive = ownerPathContains(activePath, path);
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
            {item.children!.map((c) => {
              const childTrail = [...trail, c.label];
              return c.children ? branch(c, depth + 1, childTrail) : leaf(c.label, depth + 1, childTrail);
            })}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div
      className={`wd-owner-sidebar ${collapsed ? "wd-collapsed-sidebar wd-sidebar-collapsed" : "wd-sidebar-expanded"} ${mobileOpen ? "wd-mobile-sidebar-open" : ""}`}
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
          justifyContent: collapsed ? "center" : "space-between",
          gap: "10px",
          padding: collapsed ? "0" : "0 12px 0 14px",
          borderBottom: "1px solid rgba(35,32,31,0.06)",
        }}
      >
        {collapsed ? (
          <button
            type="button"
            aria-label="Buka sidebar"
            aria-expanded={false}
            onClick={() => onCollapsedChange(false)}
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
            title="Buka sidebar"
          >
            <span className="wd-collapsed-logo-toggle" style={{ display: "grid", placeItems: "center", width: "100%", height: "100%" }}>
              <Image className="wd-collapsed-logo-img" src="/logo-icon.jpg" alt="Wanna Dimsum" width={34} height={34} style={{ objectFit: "cover" }} />
              <span className="wd-collapsed-logo-icon" aria-hidden="true" style={{ display: "none", lineHeight: 0 }}>
                <PanelLeftOpen size={18} strokeWidth={2.2} />
              </span>
            </span>
          </button>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "9px",
                  border: "1px solid rgba(35,32,31,0.08)",
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <Image src="/logo-icon.jpg" alt="Wanna Dimsum" width={34} height={34} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ lineHeight: 1.05, minWidth: 0 }}>
                <div style={{ fontSize: "13.5px", fontWeight: 800, whiteSpace: "nowrap" }}>
                  <span style={{ color: "#A91F34" }}>WANNA</span> DIMSUM
                </div>
                <div style={{ fontSize: "10px", color: "rgba(35,32,31,0.45)", fontWeight: 600, marginTop: "2px" }}>Business Suite</div>
              </div>
            </div>
            <button
              type="button"
              aria-label="Tutup sidebar"
              aria-expanded={true}
              onClick={() => onCollapsedChange(true)}
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "9px",
                background: "#fff",
                border: "1px solid rgba(35,32,31,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#A91F34",
                flexShrink: 0,
              }}
              title="Tutup sidebar"
            >
              <PanelLeftClose size={17} strokeWidth={2.2} />
            </button>
          </>
        )}
      </div>
      <div className="wd-scroll" style={{ flex: 1, overflowY: "auto", padding: collapsed ? "10px 10px 20px" : "10px 10px 20px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: collapsed ? "center" : "stretch", gap: collapsed ? "4px" : "2px" }}>
          {collapsed
            ? NAV.map(railItem)
            : NAV.map((item) => (item.children ? branch(item, 0, [item.label]) : leaf(item.label, 0, [item.label])))}
        </div>
      </div>
    </div>
  );
}
