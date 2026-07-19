"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ChevronDown, Settings, UserCircle } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { tokens } from "@/lib/tokens";

interface RoleProfileMenuProps {
  name: string;
  roleLabel: string;
  initials: string;
  onProfile?: () => void;
  onSettings?: () => void;
}

export function RoleProfileMenu({ name, roleLabel, initials, onProfile, onSettings }: RoleProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const menuActionStyle: CSSProperties = {
    width: "100%",
    border: "none",
    background: "transparent",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 10,
    fontFamily: "inherit",
    fontSize: 12.5,
    fontWeight: 750,
    color: "rgba(35,32,31,0.78)",
    cursor: "pointer",
    textAlign: "left",
  };

  return (
    <div ref={rootRef} style={{ position: "relative", display: "flex" }}>
      <button
        type="button"
        aria-label="Buka menu profil"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        style={{
          border: "none",
          background: "transparent",
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: 0,
          cursor: "pointer",
          color: "rgba(35,32,31,0.45)",
          fontFamily: "inherit",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: tokens.primary,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 13.5,
            lineHeight: 1,
          }}
        >
          {initials}
        </span>
        <ChevronDown size={15} strokeWidth={2.2} />
      </button>

      {open ? (
        <div
          aria-label="Menu profil"
          className="wd-profile-menu"
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            zIndex: 60,
            width: 228,
            background: "#fff",
            border: "1px solid rgba(35,32,31,0.08)",
            borderRadius: 14,
            boxShadow: "0 20px 44px -28px rgba(35,32,31,0.45)",
            padding: 8,
          }}
        >
          <div style={{ padding: "10px 12px 12px", borderBottom: "1px solid rgba(35,32,31,0.07)", marginBottom: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 850, color: tokens.suiteInk }}>{name}</div>
            <div style={{ marginTop: 2, fontSize: 11, fontWeight: 650, color: "rgba(35,32,31,0.48)" }}>{roleLabel}</div>
          </div>

          {onProfile ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onProfile();
              }}
              style={menuActionStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#FAFAFA")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <UserCircle size={16} strokeWidth={2.1} />
              Profil akun
            </button>
          ) : null}

          {onSettings ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onSettings();
              }}
              style={menuActionStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#FAFAFA")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Settings size={16} strokeWidth={2.1} />
              Pengaturan akun
            </button>
          ) : null}

          <div style={{ height: 1, background: "rgba(35,32,31,0.07)", margin: "6px 0" }} />
          <LogoutButton
            variant="full"
            style={{
              ...menuActionStyle,
              color: tokens.primary,
              justifyContent: "flex-start",
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
