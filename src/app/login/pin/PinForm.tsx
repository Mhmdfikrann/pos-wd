"use client";

/**
 * PIN fast-login for cashiers (PRD §8.1, §13.5 touch-friendly). Posts to the
 * custom `/api/auth/sign-in/pin` endpoint (see src/lib/pin-plugin.ts) — the
 * username() client plugin doesn't cover this route, so we fetch it directly.
 * On success the server has set the standard session cookie.
 */
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Delete, KeyRound, Loader2 } from "lucide-react";
import { tokens } from "@/lib/tokens";

const PIN_LEN = 4;

export function PinForm({ next }: { next?: string }) {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const dest = next && next.startsWith("/") ? next : null;

  async function submit(currentPin: string) {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/sign-in/pin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: username.trim().toLowerCase(), pin: currentPin }),
      });
      if (!res.ok) {
        setError("PIN atau username salah.");
        setPin("");
        setBusy(false);
        return;
      }
      window.location.assign(dest ?? "/");
    } catch {
      setError("Gagal terhubung. Coba lagi.");
      setPin("");
      setBusy(false);
    }
  }

  function press(digit: string) {
    if (busy || pin.length >= PIN_LEN) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    setError(null);
    if (nextPin.length === PIN_LEN) submit(nextPin);
  }

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

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
              Masuk cepat · PIN kasir
            </div>
          </div>
        </div>

        <div className="bg-white border border-black/[0.06] rounded-2xl p-6 shadow-[0_18px_40px_-30px_rgba(127,22,40,0.5)]">
          <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(45,32,34,0.6)" }}>
            Username
          </label>
          <input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className="w-full rounded-xl border border-black/[0.1] px-3.5 py-2.5 text-sm outline-none focus:border-[#A91F34] transition-colors"
            placeholder="mis. kasir"
          />

          {/* PIN dots */}
          <div className="flex justify-center gap-3 my-6">
            {Array.from({ length: PIN_LEN }).map((_, i) => (
              <span
                key={i}
                className="w-3.5 h-3.5 rounded-full transition-colors"
                style={{
                  background: i < pin.length ? tokens.primary : "rgba(45,32,34,0.12)",
                }}
              />
            ))}
          </div>

          {error && (
            <div
              className="mb-4 text-xs font-semibold rounded-lg px-3 py-2 text-center"
              style={{ background: "#FBE7E7", color: "#B83636" }}
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2.5">
            {keys.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => press(k)}
                disabled={busy || !username}
                className="rounded-xl py-3.5 text-lg font-bold border border-black/[0.08] transition-colors hover:bg-black/[0.03] disabled:opacity-40"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {k}
              </button>
            ))}
            <div />
            <button
              type="button"
              onClick={() => press("0")}
              disabled={busy || !username}
              className="rounded-xl py-3.5 text-lg font-bold border border-black/[0.08] transition-colors hover:bg-black/[0.03] disabled:opacity-40"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              0
            </button>
            <button
              type="button"
              onClick={() => {
                if (busy) return;
                setPin((p) => p.slice(0, -1));
                setError(null);
              }}
              disabled={busy || pin.length === 0}
              className="rounded-xl py-3.5 flex items-center justify-center border border-black/[0.08] transition-colors hover:bg-black/[0.03] disabled:opacity-40"
              aria-label="Hapus"
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Delete size={18} />}
            </button>
          </div>

          <Link
            href={dest ? `/login?next=${encodeURIComponent(dest)}` : "/login"}
            className="mt-5 w-full rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 border border-black/[0.1] transition-colors hover:bg-black/[0.02]"
            style={{ color: tokens.ink }}
          >
            <KeyRound size={16} />
            Masuk dengan password
          </Link>
        </div>
      </div>
    </div>
  );
}
