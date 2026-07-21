import Link from "next/link";
import { startCustomerLoginAction } from "@/lib/customer-actions";
import { MemberAuthShell, inputStyle, labelStyle, primaryButtonStyle } from "../MemberAuthShell";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const { error, notice } = await searchParams;
  return (
    <MemberAuthShell
      title="Login member"
      subtitle="Masukkan email dan password yang kamu buat saat daftar member."
      error={error}
      notice={notice}
      footer={<p style={{ textAlign: "center", fontSize: 14, color: "rgba(45,32,34,0.62)" }}>Belum punya akun? <Link href="/member/register" style={{ fontWeight: 800 }}>Daftar gratis</Link></p>}
    >
      <form action={startCustomerLoginAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <label><span style={labelStyle}>Email</span><input name="email" required type="email" placeholder="nama@email.com" style={inputStyle} /></label>
        <label><span style={labelStyle}>Password</span><input name="password" required type="password" minLength={8} placeholder="Password member" style={inputStyle} /></label>
        <button type="submit" style={primaryButtonStyle}>Login Member</button>
      </form>
    </MemberAuthShell>
  );
}
