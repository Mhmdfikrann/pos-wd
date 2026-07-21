/** Active predefined promotions backed by discounts table (MVP promo selector). */
import "server-only";
import { db } from "@/db";
import { discounts } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface PromoRef {
  id: string;
  name: string;
  type: "percent" | "amount";
  value: number;
}

export function listActivePromos(): PromoRef[] {
  return db
    .select({ id: discounts.id, name: discounts.name, type: discounts.type, value: discounts.value })
    .from(discounts)
    .where(eq(discounts.active, true))
    .all();
}
