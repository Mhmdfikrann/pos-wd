"use client";

/**
 * Shared logout control (PRD §8.1 — session teardown). Signs out via better-auth
 * (clears the HTTP-only cookie server-side) then hard-navigates to /login so all
 * server guards re-evaluate against the now-absent session.
 */
import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function LogoutButton({
  variant = "icon",
  className,
  style,
}: {
  variant?: "icon" | "full";
  className?: string;
  style?: React.CSSProperties;
}) {
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      await authClient.signOut();
    } finally {
      window.location.assign("/login");
    }
  }

  const Icon = busy ? Loader2 : LogOut;

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={logout}
        disabled={busy}
        className={className}
        style={style}
        title="Keluar"
      >
        <Icon size={16} className={busy ? "animate-spin" : undefined} />
        Keluar
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      title="Keluar"
      className={className}
      style={{
        width: 38,
        height: 38,
        border: "1px solid rgba(35,32,31,0.12)",
        borderRadius: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: busy ? "default" : "pointer",
        background: "#fff",
        color: "rgba(35,32,31,0.6)",
        ...style,
      }}
    >
      <Icon size={17} className={busy ? "animate-spin" : undefined} />
    </button>
  );
}
