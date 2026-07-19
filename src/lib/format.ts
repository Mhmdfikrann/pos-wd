/**
 * Formatting helpers shared across all POS screens.
 * Money is always handled as integer rupiah (PRD BR-002).
 */

/** Format an integer rupiah amount, e.g. 18000 -> "Rp 18.000". */
export function formatRupiah(amount: number): string {
  return "Rp " + Math.round(amount).toLocaleString("id-ID");
}

/** Format a plain number with Indonesian grouping, e.g. 1284 -> "1.284". */
export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString("id-ID");
}

/** Format seconds as mm:ss, e.g. 312 -> "5:12". */
export function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Format a Date as HH:mm:ss for a live clock. */
export function formatClock(d: Date): string {
  return d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
