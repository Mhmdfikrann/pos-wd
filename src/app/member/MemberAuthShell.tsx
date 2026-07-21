import Image from "next/image";
import Link from "next/link";

export function MemberAuthShell({
  title,
  subtitle,
  error,
  notice,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  error?: string;
  notice?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main style={{ minHeight: "100vh", background: "#FFF9F2", color: "#2D2022", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <section style={{ width: "100%", maxWidth: 430, background: "#fff", border: "1px solid rgba(45,32,34,0.08)", borderRadius: 28, padding: 24, boxShadow: "0 30px 70px -42px rgba(127,22,40,0.55)" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 11, color: "#2D2022" }}>
          <span style={{ width: 42, height: 42, borderRadius: 12, background: "#fff", border: "1px solid rgba(45,32,34,0.08)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <Image src="/logo-icon.jpg" alt="Wanna Dimsum" width={38} height={38} />
          </span>
          <span style={{ lineHeight: 1.05 }}>
            <strong style={{ fontSize: 16, fontWeight: 800 }}><span style={{ color: "#A91F34" }}>WANNA</span> REWARDS</strong>
            <span className="font-mono" style={{ display: "block", fontSize: 9, letterSpacing: "0.14em", color: "rgba(45,32,34,0.45)", textTransform: "uppercase", marginTop: 2 }}>Customer App</span>
          </span>
        </Link>
        <div style={{ marginTop: 28 }}>
          <div className="font-mono" style={{ display: "inline-flex", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#A9791F", background: "#FFF4D6", padding: "7px 12px", borderRadius: 999, fontWeight: 700 }}>Email Login</div>
          <h1 style={{ fontSize: 34, lineHeight: 1.04, letterSpacing: "-0.03em", fontWeight: 800, marginTop: 14 }}>{title}</h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: "rgba(45,32,34,0.62)", marginTop: 10 }}>{subtitle}</p>
        </div>
        {error ? <div role="alert" style={{ marginTop: 18, border: "1px solid rgba(214,69,69,0.28)", background: "#FFF1F2", color: "#A91F34", borderRadius: 14, padding: "12px 14px", fontSize: 14, fontWeight: 700 }}>{error}</div> : null}
        {notice ? <div role="status" style={{ marginTop: 18, border: "1px solid rgba(35,129,82,0.22)", background: "#E4F4EC", color: "#238152", borderRadius: 14, padding: "12px 14px", fontSize: 14, fontWeight: 700 }}>{notice}</div> : null}
        <div style={{ marginTop: 22 }}>{children}</div>
        {footer ? <div style={{ marginTop: 20 }}>{footer}</div> : null}
      </section>
    </main>
  );
}

export const inputStyle = {
  width: "100%",
  height: 50,
  borderRadius: 13,
  border: "1px solid rgba(45,32,34,0.14)",
  padding: "0 14px",
  fontSize: 15,
  color: "#2D2022",
  background: "#FFFDF9",
} as const;

export const labelStyle = {
  display: "block",
  fontSize: 13,
  fontWeight: 800,
  color: "rgba(45,32,34,0.72)",
  marginBottom: 7,
} as const;

export const primaryButtonStyle = {
  width: "100%",
  height: 52,
  border: "none",
  borderRadius: 14,
  background: "#A91F34",
  color: "#fff",
  fontSize: 15,
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 16px 30px -16px rgba(127,22,40,0.9)",
} as const;
