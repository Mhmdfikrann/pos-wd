/**
 * Inventory data-access wrapper (Phase 7) bound to the app DB.
 */
import "server-only";
import { db } from "@/db";
import {
  adjustStock as adjustStockCore,
  deductStockForOrder as deductStockForOrderCore,
  listStock as listStockCore,
  type AdjustStockInput,
  type DeductStockForOrderInput,
  type DeductStockResult,
  type ListStockInput,
  type StockView,
} from "@/lib/inventory-data";

export type {
  AdjustStockInput,
  DeductStockForOrderInput,
  DeductStockResult,
  ListStockInput,
  StockView,
} from "@/lib/inventory-data";

export type {
  ManualMovementType,
  StockCategory,
  StockStatus,
} from "@/lib/inventory-core";

export function listStock(input: ListStockInput): StockView[] {
  return listStockCore(db, input);
}

export function adjustStock(input: AdjustStockInput): StockView {
  return adjustStockCore(db, input);
}

export function deductStockForOrder(input: DeductStockForOrderInput): DeductStockResult {
  return deductStockForOrderCore(db, input);
}
