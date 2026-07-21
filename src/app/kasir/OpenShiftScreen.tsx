"use client";

/**
 * Open-shift gate (Phase 4, PRD §10.1). Shown by the Kasir route when the
 * cashier has no active shift. Picking an outlet + entering opening cash calls
 * `actionOpenShift`; on success we hard-navigate so the server re-reads shift
 * state and renders the POS.
 *
 * Opening cash is integer rupiah (BR-002/BR-008): the input strips non-digits
 * and the server re-validates non-negative — the button is the convenience, the
 * action is the gate.
 */
import { useState } from "react";
import Image from "next/image";
import { Clock, Wallet, LogIn, Loader2 } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { actionOpenShift } from "@/lib/shift-actions";
import type { OutletRef } from "@/lib/outlets";

const MONO = "var(--font-mono), monospace";
const QUICK = [50000, 100000, 200000, 500000];

export default function OpenShiftScreen({
  outlets,
  cashierName,
}: {
  outlets: OutletRef[];
  cashierName: string;
}) {
  const [outletId, setOutletId] = useState(outlets[0]?.id ?? "");
  const [cash, setCash] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const noOutlet = outlets.length === 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || noOutlet) return;
    setBusy(true);
    setError(null);
    const res = await actionOpenShift({ outletId, openingCash: cash });
    if (res.ok) {
      // Hard reload so the server component re-reads the now-open shift.
      window.location.assign("/kasir");
      return;
    }
    setError(res.error);
    setBusy(false);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#FFF9F2",
        color: "#2D2022",
        padding: 24,
      }}
    >
      <form
        onSubmit={submit}
        className="wd-slideup"
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          border: "1px solid rgba(45,32,34,0.08)",
          borderRadius: 18,
          padding: 28,
          boxShadow: "0 30px 60px -30px rgba(127,22,40,0.4)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 18 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 11,
              background: "#fff",
              border: "1px solid rgba(45,32,34,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <Image src="/logo-icon.jpg" alt="Wanna Dimsum" width={38} height={38} style={{ objectFit: "contain" }} />
          </div>
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Buka Shift</div>
            <div style={{ fontSize: 12, color: "rgba(45,32,34,0.5)", fontWeight: 600 }}>
              Halo, {cashierName}. Mulai shift untuk menerima transaksi.
            </div>
          </div>
        </div>

        <div
          aria-label={`Kasir aktif: ${cashierName}`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            border: "1px solid rgba(169,31,52,0.14)",
            borderRadius: 12,
            background: "#FFF9F2",
            padding: "10px 12px",
            marginBottom: 16,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(45,32,34,0.42)" }}>
              Kasir aktif
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#2D2022", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {cashierName}
            </div>
          </div>
          <span
            style={{
              flexShrink: 0,
              borderRadius: 999,
              background: "#E4F4EC",
              color: "#238152",
              padding: "6px 9px",
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            dari session
          </span>
        </div>

        {noOutlet ? (
          <div
            style={{ background: "#FBE7E7", color: "#B83636", borderRadius: 10, padding: "12px 14px", fontSize: 13, fontWeight: 600 }}
            role="alert"
          >
            Akun Anda belum di-assign ke outlet mana pun. Hubungi manajer.
          </div>
        ) : (
          <>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "rgba(45,32,34,0.6)", marginBottom: 6 }}>
              Outlet
            </label>
            <select
              value={outletId}
              onChange={(e) => setOutletId(e.target.value)}
              style={{
                width: "100%",
                height: 46,
                border: "1.5px solid rgba(45,32,34,0.14)",
                borderRadius: 11,
                padding: "0 13px",
                fontFamily: "inherit",
                fontSize: 14,
                background: "#fff",
                outline: "none",
                marginBottom: 16,
              }}
            >
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.code})
                </option>
              ))}
            </select>

            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "rgba(45,32,34,0.6)", marginBottom: 6 }}>
              <Wallet size={14} strokeWidth={2} /> Kas Awal
            </label>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 26,
                fontWeight: 700,
                color: "#A91F34",
                padding: "10px 14px",
                border: "1.5px solid rgba(45,32,34,0.14)",
                borderRadius: 11,
                marginBottom: 10,
              }}
            >
              {formatRupiah(cash)}
            </div>
            <input
              value={cash === 0 ? "" : String(cash)}
              onChange={(e) => setCash(Number(e.target.value.replace(/[^0-9]/g, "")) || 0)}
              inputMode="numeric"
              placeholder="Ketik nominal kas awal"
              style={{
                width: "100%",
                height: 44,
                border: "1.5px solid rgba(45,32,34,0.14)",
                borderRadius: 11,
                padding: "0 14px",
                fontFamily: MONO,
                fontSize: 15,
                background: "#FFF9F2",
                outline: "none",
                marginBottom: 10,
              }}
            />
            <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
              {QUICK.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCash(n)}
                  style={{
                    flex: 1,
                    minWidth: 70,
                    height: 38,
                    borderRadius: 9,
                    border: "1px solid rgba(45,32,34,0.14)",
                    background: cash === n ? "#FFF1F2" : "#fff",
                    color: cash === n ? "#A91F34" : "rgba(45,32,34,0.7)",
                    fontFamily: MONO,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {n / 1000}rb
                </button>
              ))}
            </div>

            {error ? (
              <div
                style={{ background: "#FBE7E7", color: "#B83636", borderRadius: 9, padding: "10px 13px", fontSize: 12.5, fontWeight: 600, marginBottom: 14 }}
                role="alert"
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              style={{
                width: "100%",
                height: 48,
                borderRadius: 12,
                border: "none",
                background: "#A91F34",
                color: "#fff",
                fontFamily: "inherit",
                fontWeight: 800,
                fontSize: 14.5,
                cursor: busy ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} strokeWidth={2.2} />}
              Mulai Shift
            </button>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12, fontSize: 11.5, color: "rgba(45,32,34,0.45)" }}>
              <Clock size={12} /> Kas awal tercatat & tidak bisa diubah setelah shift dibuka.
            </div>
          </>
        )}
      </form>
    </div>
  );
}
