"use client";

/**
 * Username/email + password login form (PRD §8.1, §13.5 clear Indonesian errors).
 * Uses better-auth's username sign-in; on success the server sets an HTTP-only
 * session cookie and we hard-navigate so the server guards re-read it.
 */
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogIn, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { safeInternalNextPath } from "@/lib/auth-redirect";
import { tokens } from "@/lib/tokens";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const dest = safeInternalNextPath(next);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);

    const id = identifier.trim();
    const isEmail = id.includes("@");
    const { error: err } = isEmail
      ? await authClient.signIn.email({ email: id, password })
      : await authClient.signIn.username({ username: id.toLowerCase(), password });

    if (err) {
      setError("Username/email atau password salah.");
      setBusy(false);
      return;
    }
    // Hard navigation so server components re-read the fresh session cookie.
    // Empty dest → let the server route by role.
    window.location.assign(dest ?? "/");
    router.refresh();
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-16"
      style={{ background: tokens.canvas, color: tokens.ink }}
    >
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-white border border-black/[0.08] flex items-center justify-center overflow-hidden">
            <Image src="/logo-icon.jpg" alt="Wanna Dimsum" width={44} height={44} className="object-contain" />
          </div>
          <div className="leading-tight">
            <div className="text-lg font-extrabold tracking-tight">
              <span style={{ color: tokens.primary }}>WANNA</span> DIMSUM
            </div>
            <div className="text-xs font-semibold" style={{ color: "rgba(45,32,34,0.5)" }}>
              Point of Sale · Masuk ke akun
            </div>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="bg-white border border-black/[0.06] rounded-2xl p-6 shadow-[0_18px_40px_-30px_rgba(127,22,40,0.5)]"
        >
          <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(45,32,34,0.6)" }}>
            Username atau Email
          </label>
          <input
            autoFocus
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            className="w-full rounded-xl border border-black/[0.1] px-3.5 py-2.5 text-sm outline-none focus:border-[#A91F34] transition-colors"
            placeholder="mis. kasir"
          />

          <label className="block text-xs font-bold mt-4 mb-1.5" style={{ color: "rgba(45,32,34,0.6)" }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full rounded-xl border border-black/[0.1] px-3.5 py-2.5 text-sm outline-none focus:border-[#A91F34] transition-colors"
            placeholder="••••••••"
          />

          {error && (
            <div
              className="mt-4 text-xs font-semibold rounded-lg px-3 py-2"
              style={{ background: "#FBE7E7", color: "#B83636" }}
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !identifier || !password}
            className="mt-5 w-full rounded-xl py-2.5 text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
            style={{ background: tokens.primary }}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            Masuk
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: "rgba(45,32,34,0.4)" }}>
          Wanna Dimsum POS · Sistem internal
        </p>
      </div>
    </div>
  );
}
