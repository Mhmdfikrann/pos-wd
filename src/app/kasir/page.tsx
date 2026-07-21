/**
 * Kasir (POS) route — server component.
 *
 * Guarded by kasir/layout.tsx (requireRoute). Two responsibilities here:
 *  1. Shift gate (Phase 4, PRD §10.1/BR-008): if the cashier has no open shift,
 *     render the open-shift screen instead of the catalog. Payment can't happen
 *     without an active shift, so the whole POS is gated behind one.
 *  2. Catalog (Phase 3): fetch DB-backed products/categories for the grid.
 *
 * DB → UI mapping for products:
 *  - category id (`cat_dimsum`) → the rail key used by the client filter.
 *  - `available` → the client's stock tag: unavailable products render as "out"
 *    (Habis) and are non-clickable. The mockup's "low" tier isn't modeled in the
 *    catalog (it's a stock concern, Phase 7), so available products show "ok".
 */
import KasirClient, { type Product } from "./KasirClient";
import OpenShiftScreen from "./OpenShiftScreen";
import { listCategories, listProducts } from "@/lib/catalog";
import { requireRoute } from "@/lib/session";
import { getActiveShiftForCashier } from "@/lib/shift";
import { listOutlets } from "@/lib/outlets";
import { listActivePromos } from "@/lib/promotions";
import { listHeldOrders } from "@/lib/order";

export default async function KasirPage() {
  const session = await requireRoute("/kasir");

  // Shift gate — the cashier's open shift across their assigned outlets.
  const active = await getActiveShiftForCashier(session.userId, session.outletIds);

  if (!active) {
    const outlets = await listOutlets(session.outletIds);
    return <OpenShiftScreen outlets={outlets} cashierName={session.name} />;
  }

  // Active shift → render the POS scoped to that shift's outlet.
  const [cats, prods, outlets, promos, heldOrders] = await Promise.all([
    listCategories(),
    listProducts(),
    listOutlets([active.outletId]),
    listActivePromos(),
    Promise.resolve(listHeldOrders(active.outletId)),
  ]);
  const outletName = outlets[0]?.name ?? "Outlet";
  const taxPercent = outlets[0]?.taxPercent ?? 11;

  const products: Product[] = prods.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    cat: p.categoryId,
    stock: p.available ? "ok" : "out",
  }));

  // Rail labels: [categoryId, name] in sortOrder (Semua is prepended client-side).
  const categories: [string, string][] = cats.map((c) => [c.id, c.name]);

  return (
    <KasirClient
      products={products}
      categories={categories}
      outletId={active.outletId}
      outletName={outletName}
      cashierName={session.name}
      shiftId={active.id}
      shiftOpenedAt={active.openedAt}
      taxPercent={taxPercent}
      promos={promos}
      heldOrders={heldOrders}
    />
  );
}
