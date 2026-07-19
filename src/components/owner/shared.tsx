import type { CSSProperties, ReactNode } from "react";
import { ic } from "./icons";
import { findPath } from "./nav";

export const MONO = "var(--font-mono), monospace";

/** Port of TONES map. [bg, fg] pairs. */
export const TONES: Record<string, [string, string]> = {
  ok: ["#E4F4EC", "#238152"],
  low: ["#FCEEDB", "#C67A15"],
  warn: ["#FCEEDB", "#C67A15"],
  out: ["#EFEAEA", "#5A4B4D"],
  info: ["#EEF2FB", "#3A5BB0"],
  danger: ["#FBE7E7", "#B83636"],
  neutral: ["#F1EEEA", "#5A4B4D"],
  gold: ["#FFF4D6", "#A9791F"],
};

/** Port of `badge(text, tone)`. */
export function Badge({ text, tone }: { text: string; tone?: string }) {
  const [bg, c] = TONES[tone || "neutral"];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "11.5px",
        fontWeight: 700,
        padding: "4px 11px",
        borderRadius: "999px",
        background: bg,
        color: c,
      }}
    >
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: c }} />
      {text}
    </span>
  );
}

/** Port of `crumb(label)`. */
export function Crumb({ label }: { label: string }) {
  const path = findPath(label);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "7px",
        fontSize: "12px",
        fontWeight: 600,
        color: "rgba(35,32,31,0.45)",
        marginBottom: "7px",
      }}
    >
      {path.map((s, i) => (
        <span key={i} style={{ display: "contents" }}>
          {i > 0 ? <span style={{ color: "rgba(35,32,31,0.25)" }}>/</span> : null}
          <span style={{ color: i === path.length - 1 ? "#A91F34" : "inherit" }}>{s}</span>
        </span>
      ))}
    </div>
  );
}

/** Port of `pageHead(label, actionLabel, subtitle)`. */
export function PageHead({
  label,
  actionLabel,
  subtitle,
}: {
  label: string;
  actionLabel?: string | null;
  subtitle?: string | null;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: "16px",
        marginBottom: "18px",
        flexWrap: "wrap",
      }}
    >
      <div>
        <Crumb label={label} />
        <div style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.02em" }}>{label}</div>
        {subtitle ? (
          <div style={{ fontSize: "13.5px", color: "rgba(35,32,31,0.55)", marginTop: "3px" }}>{subtitle}</div>
        ) : null}
      </div>
      {actionLabel ? (
        <button
          style={{
            height: "42px",
            padding: "0 18px",
            borderRadius: "10px",
            border: "none",
            background: "#A91F34",
            color: "#fff",
            fontFamily: "inherit",
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {ic("plus", 15, "#fff", 2.4)}
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

/** Port of `miniStat(label, value, sub, tone)`. */
export function MiniStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string | null;
  tone?: string | null;
}) {
  const col = tone === "up" ? "#2E9D64" : tone === "down" ? "#D64545" : "rgba(35,32,31,0.5)";
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(35,32,31,0.06)",
        borderRadius: "14px",
        padding: "16px 18px",
      }}
    >
      <div style={{ fontSize: "12px", fontWeight: 700, color: "rgba(35,32,31,0.5)" }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: "21px", fontWeight: 700, marginTop: "8px" }}>{value}</div>
      {sub ? <div style={{ fontSize: "12px", fontWeight: 700, color: col, marginTop: "5px" }}>{sub}</div> : null}
    </div>
  );
}

export type StyleObj = CSSProperties;
export type { ReactNode };
