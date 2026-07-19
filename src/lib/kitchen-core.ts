/**
 * Pure Kitchen Display rules (Phase 6).
 *
 * Kept dependency-free so status validation and station mapping can be tested
 * without loading Next/server-only modules.
 */

export type KitchenStatus = "new" | "accepted" | "preparing" | "ready" | "completed" | "cancelled";
export type KitchenBoardStatus = "baru" | "proses" | "siap";
export type KitchenStation = "kukus" | "goreng" | "minuman";
export type KitchenStationFilter = "all" | KitchenStation;

const NEXT: Record<KitchenStatus, KitchenStatus[]> = {
  new: ["accepted", "preparing", "cancelled"],
  accepted: ["preparing", "cancelled", "new"],
  preparing: ["ready", "cancelled", "new"],
  ready: ["completed", "cancelled", "preparing"],
  completed: [],
  cancelled: [],
};

export class KitchenTransitionError extends Error {
  constructor(from: KitchenStatus, to: KitchenStatus) {
    super(`Transisi status dapur tidak valid: ${from} -> ${to}.`);
    this.name = "KitchenTransitionError";
  }
}

export function assertKitchenTransition(from: KitchenStatus, to: KitchenStatus): void {
  if (!NEXT[from]?.includes(to)) {
    throw new KitchenTransitionError(from, to);
  }
}

export function toBoardStatus(status: KitchenStatus): KitchenBoardStatus | null {
  if (status === "new" || status === "accepted") return "baru";
  if (status === "preparing") return "proses";
  if (status === "ready") return "siap";
  return null;
}

export function nextVisibleStatus(status: KitchenStatus): KitchenStatus | null {
  if (status === "new" || status === "accepted") return "preparing";
  if (status === "preparing") return "ready";
  if (status === "ready") return "completed";
  return null;
}

export function previousVisibleStatus(status: KitchenStatus): KitchenStatus | null {
  if (status === "preparing") return "new";
  if (status === "ready") return "preparing";
  return null;
}

export function normalizeKitchenStation(value: string | null | undefined): KitchenStation | null {
  const v = value?.trim().toLowerCase();
  if (!v) return null;
  if (v.includes("kukus")) return "kukus";
  if (v.includes("goreng")) return "goreng";
  if (v.includes("minuman")) return "minuman";
  return null;
}
