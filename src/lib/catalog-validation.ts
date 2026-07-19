/**
 * Pure catalog input validators (Phase 3, PRD §8.3, BR-002).
 *
 * Extracted from the `"use server"` actions file so they can be unit-tested and
 * reused: a server-action module may only export async functions, but these are
 * synchronous. The actions call these before touching the data layer; they throw
 * a clear Indonesian message on bad input, which the action wrapper turns into a
 * `{ ok: false, error }` result.
 */

/** Trim + require a non-empty, bounded name. */
export function cleanName(v: unknown): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (s.length === 0) throw new Error("Nama wajib diisi.");
  if (s.length > 120) throw new Error("Nama terlalu panjang.");
  return s;
}

/** Require a non-negative integer rupiah amount (BR-002 — no floats). */
export function cleanRupiah(v: unknown, field: string): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    throw new Error(`${field} harus bilangan rupiah bulat ≥ 0.`);
  }
  return n;
}

/** Normalize + validate a SKU (uppercase, alnum/dash, 2-32 chars). */
export function cleanSku(v: unknown): string {
  const s = typeof v === "string" ? v.trim().toUpperCase() : "";
  if (s.length === 0) throw new Error("SKU wajib diisi.");
  if (!/^[A-Z0-9-]{2,32}$/.test(s)) throw new Error("SKU hanya huruf/angka/strip, 2-32 karakter.");
  return s;
}
