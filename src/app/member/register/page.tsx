import Link from "next/link";
import { registerCustomerAction } from "@/lib/customer-actions";
import { MemberAuthShell, inputStyle, labelStyle, primaryButtonStyle } from "../MemberAuthShell";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <MemberAuthShell
      title="Daftar member gratis"
      subtitle="Masukkan data singkat untuk mulai kumpulkan poin Wanna Rewards. Setelah daftar, login memakai email dan password."
      error={error}
      footer={<p style={{ textAlign: "center", fontSize: 14, color: "rgba(45,32,34,0.62)" }}>Sudah punya akun? <Link href="/member/login" style={{ fontWeight: 800 }}>Login member</Link></p>}
    >
      <form action={registerCustomerAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <label><span style={labelStyle}>Nama lengkap</span><input name="fullName" required minLength={3} placeholder="Budi Santoso" style={inputStyle} /></label>
        <label><span style={labelStyle}>Nomor HP</span><input name="phone" required inputMode="tel" placeholder="081234567890" style={inputStyle} /></label>
        <label><span style={labelStyle}>Email</span><input name="email" required type="email" placeholder="nama@email.com" style={inputStyle} /></label>
        <label><span style={labelStyle}>Password</span><input name="password" required type="password" minLength={8} placeholder="Minimal 8 karakter" style={inputStyle} /></label>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5, lineHeight: 1.45, color: "rgba(45,32,34,0.72)" }}><input name="termsAccepted" type="checkbox" required style={{ marginTop: 3 }} />Saya menyetujui syarat layanan Wanna Rewards.</label>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5, lineHeight: 1.45, color: "rgba(45,32,34,0.72)" }}><input name="privacyAccepted" type="checkbox" required style={{ marginTop: 3 }} />Saya menyetujui kebijakan privasi.</label>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5, lineHeight: 1.45, color: "rgba(45,32,34,0.72)" }}><input name="marketingOptIn" type="checkbox" style={{ marginTop: 3 }} />Kirim promo dan voucher spesial ke email saya.</label>
        <button type="submit" style={primaryButtonStyle}>Daftar Akun</button>
      </form>
    </MemberAuthShell>
  );
}
