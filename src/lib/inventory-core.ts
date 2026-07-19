export type StockStatus = "ok" | "low" | "out";
export type StockCategory = "bahan" | "kemasan" | "minuman" | "operasional";
export type ManualMovementType = "in" | "out" | "adjustment" | "waste" | "opname";

export class InventoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InventoryError";
  }
}

export function stockStatus(quantity: number, minQuantity: number): StockStatus {
  if (quantity <= 0) return "out";
  if (quantity <= minQuantity) return "low";
  return "ok";
}

export function normalizeStockCategory(value: string | null): StockCategory {
  if (value === "kemasan" || value === "minuman" || value === "operasional") return value;
  return "bahan";
}

export function assertPositiveQuantity(quantity: number): void {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new InventoryError("Jumlah stok harus lebih dari 0.");
  }
}

export function nextQuantity(current: number, type: ManualMovementType, quantity: number): number {
  assertPositiveQuantity(quantity);
  if (type === "in") return current + quantity;
  if (type === "out" || type === "waste") return assertNonNegative(current - quantity);
  if (type === "opname") return quantity;
  return assertNonNegative(current + quantity);
}

export function movementQuantity(type: ManualMovementType, current: number, quantity: number): number {
  assertPositiveQuantity(quantity);
  if (type === "in") return quantity;
  if (type === "out" || type === "waste") return -quantity;
  if (type === "opname") return quantity - current;
  return quantity;
}

export function assertNonNegative(quantity: number): number {
  if (quantity < 0) {
    throw new InventoryError("Stok tidak mencukupi untuk transaksi ini.");
  }
  return quantity;
}
