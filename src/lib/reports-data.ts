/**
 * Owner report data access (Phase 10).
 *
 * DB-parameterized so report aggregation can be tested against in-memory
 * SQLite. Callers must pass outletIds from the authoritative server-side scope;
 * `from` is inclusive and `to` is exclusive.
 */
import { and, asc, desc, eq, gte, inArray, isNotNull, lt } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
  cashMovements,
  categories,
  inventoryItems,
  orderItems,
  orders,
  outlets,
  outletStock,
  payments,
  products,
  refunds,
  shifts,
  users,
} from "@/db/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ReportsDb = BetterSQLite3Database<any>;

export interface OwnerReportInput {
  outletIds: string[];
  from: string;
  to: string;
}

export interface OwnerReportSummary {
  grossSales: number;
  netSales: number;
  orderCount: number;
  productsSold: number;
  refundAmount: number;
  voidAmount: number;
  discountAmount: number;
  expenseAmount: number;
}

export interface DailySalesRow {
  date: string;
  label: string;
  total: number;
  orders: number;
}

export interface PaymentMethodReportRow {
  method: string;
  total: number;
  count: number;
  percent: number;
  color: string;
}

export interface ProductSalesReportRow {
  productId: string | null;
  name: string;
  sku: string | null;
  category: string;
  sold: number;
  revenue: number;
  stock: number;
  tone: "ok" | "low" | "out";
}

export interface CategorySalesReportRow {
  name: string;
  sold: number;
  revenue: number;
}

export interface DeliveryProviderReportRow {
  provider: string;
  total: number;
  count: number;
}

export interface OrderChannelReportRow {
  channel: string;
  total: number;
  count: number;
}

export interface PromoDiscountReportRow {
  promoName: string;
  amount: number;
  orders: number;
}

export interface CashierSalesReportRow {
  cashierName: string;
  orders: number;
  netSales: number;
}

export interface ShiftReconciliationReportRow {
  shiftId: string;
  outletName: string;
  cashierName: string;
  openedAt: string;
  closedAt: string | null;
  expectedCash: number | null;
  actualCash: number | null;
  cashDifference: number | null;
  status: "open" | "closed";
}

export interface InventoryReportRow {
  id: string;
  outletId: string;
  outletName: string;
  itemId: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  status: "ok" | "low" | "out";
  value: number;
}

export interface FinanceEventReportRow {
  kind: "refund" | "void" | "discount" | "expense";
  amount: number;
  orderNo: string;
  actorName: string | null;
  note: string | null;
  createdAt: string;
}

export interface RecentOrderReportRow {
  id: string;
  orderNo: string;
  meta: string;
  amount: number;
  time: string;
  method: string;
  status: string;
}

export interface OwnerReportSnapshot {
  range: {
    from: string;
    to: string;
  };
  summary: OwnerReportSummary;
  dailySales: DailySalesRow[];
  paymentMethods: PaymentMethodReportRow[];
  topProducts: ProductSalesReportRow[];
  recentOrders: RecentOrderReportRow[];
  productSales: ProductSalesReportRow[];
  categorySales: CategorySalesReportRow[];
  deliveryProviders: DeliveryProviderReportRow[];
  orderChannels: OrderChannelReportRow[];
  promoDiscounts: PromoDiscountReportRow[];
  cashierSales: CashierSalesReportRow[];
  shiftReconciliation: ShiftReconciliationReportRow[];
  inventory: InventoryReportRow[];
  financeEvents: FinanceEventReportRow[];
}

type OrderStatus = "draft" | "held" | "paid" | "refunded" | "void";

const paymentLabels: Record<string, string> = {
  cash: "Tunai",
  qris: "QRIS",
  transfer: "Transfer",
  ewallet: "E-Wallet",
  card: "Kartu",
};

const paymentColors: Record<string, string> = {
  Tunai: "#A91F34",
  QRIS: "#2E9D64",
  Transfer: "#3A5BB0",
  "E-Wallet": "#C67A15",
  Kartu: "#6E56CF",
};

export function buildOwnerReport(db: ReportsDb, input: OwnerReportInput): OwnerReportSnapshot {
  if (input.outletIds.length === 0) return emptyReport(input);

  const orderRows = db
    .select({
      id: orders.id,
      orderNo: orders.orderNo,
      outletId: orders.outletId,
      outletName: outlets.name,
      cashierId: orders.cashierId,
      cashierName: users.name,
      orderType: orders.orderType,
      deliveryProvider: orders.deliveryProvider,
      channelOrderName: orders.channelOrderName,
      status: orders.status,
      subtotal: orders.subtotal,
      taxAmount: orders.taxAmount,
      discountAmount: orders.discountAmount,
      promoName: orders.promoNameSnapshot,
      total: orders.total,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .innerJoin(outlets, eq(orders.outletId, outlets.id))
    .innerJoin(users, eq(orders.cashierId, users.id))
    .where(
      and(
        inArray(orders.outletId, input.outletIds),
        gte(orders.createdAt, input.from),
        lt(orders.createdAt, input.to),
      ),
    )
    .orderBy(desc(orders.createdAt), desc(orders.orderNo))
    .all();

  const activeOrders = orderRows.filter((order) => isSalesOrder(order.status));
  const activeOrderIds = activeOrders.map((order) => order.id);
  const allOrderIds = orderRows.map((order) => order.id);

  const itemRows = activeOrderIds.length
    ? db
        .select({
          orderId: orderItems.orderId,
          productId: orderItems.productId,
          name: orderItems.nameSnapshot,
          sku: orderItems.skuSnapshot,
          price: orderItems.priceSnapshot,
          quantity: orderItems.quantity,
          categoryName: categories.name,
        })
        .from(orderItems)
        .leftJoin(products, eq(orderItems.productId, products.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(inArray(orderItems.orderId, activeOrderIds))
        .all()
    : [];

  const paymentRows = activeOrderIds.length
    ? db
        .select({
          orderId: payments.orderId,
          method: payments.method,
          provider: payments.provider,
          channelLabel: payments.channelLabel,
          amount: payments.amount,
        })
        .from(payments)
        .where(and(inArray(payments.orderId, activeOrderIds), eq(payments.status, "success")))
        .all()
    : [];

  const refundRows = activeOrderIds.length
    ? db
        .select({
          id: refunds.id,
          orderId: refunds.orderId,
          amount: refunds.amount,
          reason: refunds.reason,
          actorName: users.name,
          createdAt: refunds.createdAt,
        })
        .from(refunds)
        .leftJoin(users, eq(refunds.actorId, users.id))
        .where(and(inArray(refunds.orderId, activeOrderIds), isNotNull(refunds.approvedById)))
        .all()
    : [];

  const expenseRows = db
    .select({
      id: cashMovements.id,
      amount: cashMovements.amount,
      note: cashMovements.note,
      actorName: users.name,
      createdAt: cashMovements.createdAt,
    })
    .from(cashMovements)
    .innerJoin(shifts, eq(cashMovements.shiftId, shifts.id))
    .leftJoin(users, eq(cashMovements.actorId, users.id))
    .where(
      and(
        inArray(shifts.outletId, input.outletIds),
        eq(cashMovements.type, "expense"),
        gte(cashMovements.createdAt, input.from),
        lt(cashMovements.createdAt, input.to),
      ),
    )
    .orderBy(desc(cashMovements.createdAt))
    .all();

  const shiftRows = db
    .select({
      shiftId: shifts.id,
      outletName: outlets.name,
      cashierName: users.name,
      openedAt: shifts.openedAt,
      closedAt: shifts.closedAt,
      expectedCash: shifts.expectedCash,
      actualCash: shifts.actualCash,
      cashDifference: shifts.cashDifference,
      status: shifts.status,
    })
    .from(shifts)
    .innerJoin(outlets, eq(shifts.outletId, outlets.id))
    .innerJoin(users, eq(shifts.cashierId, users.id))
    .where(
      and(
        inArray(shifts.outletId, input.outletIds),
        gte(shifts.openedAt, input.from),
        lt(shifts.openedAt, input.to),
      ),
    )
    .orderBy(desc(shifts.openedAt))
    .all();

  const inventoryRows = db
    .select({
      id: outletStock.id,
      outletId: outletStock.outletId,
      outletName: outlets.name,
      itemId: inventoryItems.id,
      name: inventoryItems.name,
      sku: inventoryItems.sku,
      category: inventoryItems.category,
      unit: inventoryItems.unit,
      cost: inventoryItems.cost,
      quantity: outletStock.quantity,
      minQuantity: outletStock.minQuantity,
    })
    .from(outletStock)
    .innerJoin(outlets, eq(outletStock.outletId, outlets.id))
    .innerJoin(inventoryItems, eq(outletStock.inventoryItemId, inventoryItems.id))
    .where(and(inArray(outletStock.outletId, input.outletIds), eq(inventoryItems.active, true)))
    .orderBy(asc(inventoryItems.name), asc(inventoryItems.sku))
    .all();

  const refundAmount = sum(refundRows, (row) => row.amount);
  const expenseAmount = sum(expenseRows, (row) => row.amount);
  const grossSales = sum(activeOrders, (order) => order.total);
  const voidAmount = sum(
    orderRows.filter((order) => order.status === "void"),
    (order) => order.total,
  );
  const discountAmount = sum(activeOrders, (order) => order.discountAmount);
  const productsSold = sum(itemRows, (item) => item.quantity);
  const summary: OwnerReportSummary = {
    grossSales,
    netSales: grossSales - refundAmount,
    orderCount: activeOrders.length,
    productsSold,
    refundAmount,
    voidAmount,
    discountAmount,
    expenseAmount,
  };

  const orderById = new Map(orderRows.map((order) => [order.id, order]));

  const productSales = aggregateProducts(itemRows);
  const categorySales = aggregateCategories(itemRows);
  const cashierSales = aggregateCashiers(activeOrders, refundRows);
  const deliveryProviders = aggregateDeliveryProviders(activeOrders);
  const orderChannels = aggregateOrderChannels(activeOrders);
  const promoDiscounts = aggregatePromoDiscounts(activeOrders);
  const paymentMethods = aggregatePayments(paymentRows);
  const dailySales = aggregateDaily(activeOrders);
  const inventory = inventoryRows.map((row): InventoryReportRow => ({
    id: row.id,
    outletId: row.outletId,
    outletName: row.outletName,
    itemId: row.itemId,
    name: row.name,
    sku: row.sku,
    category: row.category ?? "Lainnya",
    unit: row.unit,
    quantity: row.quantity,
    minQuantity: row.minQuantity,
    status: stockStatus(row.quantity, row.minQuantity),
    value: Math.round(row.quantity * row.cost),
  }));

  return {
    range: { from: input.from, to: input.to },
    summary,
    dailySales,
    paymentMethods,
    topProducts: productSales.slice(0, 5),
    recentOrders: buildRecentOrders(activeOrders, paymentRows),
    productSales,
    categorySales,
    deliveryProviders,
    orderChannels,
    promoDiscounts,
    cashierSales,
    shiftReconciliation: shiftRows.map((row) => ({
      ...row,
      status: row.status,
    })),
    inventory,
    financeEvents: buildFinanceEvents({
      refundRows,
      orderRows,
      allOrderIds,
      expenseRows,
      orderById,
    }),
  };
}

function emptyReport(input: OwnerReportInput): OwnerReportSnapshot {
  return {
    range: { from: input.from, to: input.to },
    summary: {
      grossSales: 0,
      netSales: 0,
      orderCount: 0,
      productsSold: 0,
      refundAmount: 0,
      voidAmount: 0,
      discountAmount: 0,
      expenseAmount: 0,
    },
    dailySales: [],
    paymentMethods: [],
    topProducts: [],
    recentOrders: [],
    productSales: [],
    categorySales: [],
    deliveryProviders: [],
    orderChannels: [],
    promoDiscounts: [],
    cashierSales: [],
    shiftReconciliation: [],
    inventory: [],
    financeEvents: [],
  };
}

function isSalesOrder(status: OrderStatus): boolean {
  return status === "paid" || status === "refunded";
}

function sum<T>(rows: T[], value: (row: T) => number | null | undefined): number {
  return rows.reduce((total, row) => total + (value(row) ?? 0), 0);
}

function aggregateDaily(
  ordersInRange: Array<{ createdAt: string; total: number }>,
): DailySalesRow[] {
  const byDate = new Map<string, { total: number; orders: number }>();
  for (const order of ordersInRange) {
    const date = order.createdAt.slice(0, 10);
    const current = byDate.get(date) ?? { total: 0, orders: 0 };
    current.total += order.total;
    current.orders += 1;
    byDate.set(date, current);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, row]) => ({
      date,
      label: dateLabel(date),
      ...row,
    }));
}

function paymentReportLabel(payment: { method: string; provider?: string | null; channelLabel?: string | null }): string {
  if (payment.channelLabel) return payment.channelLabel;
  const providers: Record<string, string> = {
    edc_bca: "EDC BCA",
    edc_mandiri: "EDC Mandiri",
    edc_bca_lainnya: "EDC BCA Lainnya",
    edc_mandiri_lainnya: "EDC Mandiri Lainnya",
    bca: "Transfer Rekening BCA",
    mandiri: "Transfer Rekening Mandiri",
  };
  if (payment.provider) return providers[payment.provider] ?? payment.provider;
  return paymentLabels[payment.method] ?? payment.method;
}

function aggregatePayments(
  paymentRows: Array<{ method: string; provider?: string | null; channelLabel?: string | null; amount: number }>,
): PaymentMethodReportRow[] {
  const byMethod = new Map<string, { total: number; count: number }>();
  for (const payment of paymentRows) {
    const label = paymentReportLabel(payment);
    const current = byMethod.get(label) ?? { total: 0, count: 0 };
    current.total += payment.amount;
    current.count += 1;
    byMethod.set(label, current);
  }
  const grandTotal = sum([...byMethod.values()], (row) => row.total);
  return [...byMethod.entries()]
    .map(([method, row]) => ({
      method,
      total: row.total,
      count: row.count,
      percent: grandTotal > 0 ? Math.round((row.total / grandTotal) * 100) : 0,
      color: paymentColors[method] ?? "#5A4B4D",
    }))
    .sort((a, b) => b.total - a.total || a.method.localeCompare(b.method));
}

function aggregateProducts(
  itemRows: Array<{
    productId: string | null;
    name: string;
    sku: string | null;
    price: number;
    quantity: number;
    categoryName: string | null;
  }>,
): ProductSalesReportRow[] {
  const byProduct = new Map<string, ProductSalesReportRow>();
  for (const item of itemRows) {
    const key = item.productId ?? `${item.name}:${item.sku ?? ""}`;
    const current =
      byProduct.get(key) ??
      ({
        productId: item.productId,
        name: item.name,
        sku: item.sku,
        category: item.categoryName ?? "Lainnya",
        sold: 0,
        revenue: 0,
        stock: 999,
        tone: "ok",
      } satisfies ProductSalesReportRow);
    current.sold += item.quantity;
    current.revenue += item.price * item.quantity;
    byProduct.set(key, current);
  }
  return [...byProduct.values()].sort((a, b) => b.revenue - a.revenue || a.name.localeCompare(b.name));
}

function aggregateCategories(
  itemRows: Array<{ categoryName: string | null; price: number; quantity: number }>,
): CategorySalesReportRow[] {
  const byCategory = new Map<string, CategorySalesReportRow>();
  for (const item of itemRows) {
    const name = item.categoryName ?? "Lainnya";
    const current = byCategory.get(name) ?? { name, sold: 0, revenue: 0 };
    current.sold += item.quantity;
    current.revenue += item.price * item.quantity;
    byCategory.set(name, current);
  }
  return [...byCategory.values()].sort((a, b) => b.revenue - a.revenue || a.name.localeCompare(b.name));
}


function aggregateDeliveryProviders(
  ordersInRange: Array<{ orderType: string; deliveryProvider?: string | null; total: number }>,
): DeliveryProviderReportRow[] {
  const labels: Record<string, string> = {
    gofood: "GoFood",
    grabfood: "GrabFood",
    shopeefood: "ShopeeFood",
  };
  const byProvider = new Map<string, DeliveryProviderReportRow>();
  for (const order of ordersInRange) {
    if (order.orderType !== "delivery") continue;
    const key = order.deliveryProvider ?? "delivery";
    const current = byProvider.get(key) ?? { provider: labels[key] ?? key, total: 0, count: 0 };
    current.total += order.total;
    current.count += 1;
    byProvider.set(key, current);
  }
  return [...byProvider.values()].sort((a, b) => b.total - a.total || a.provider.localeCompare(b.provider));
}

function channelLabel(order: { orderType: string; deliveryProvider?: string | null }): string {
  if (order.orderType === "dinein") return "Dine-in";
  if (order.orderType === "takeaway") return "Take away";
  const labels: Record<string, string> = { gofood: "Delivery GoFood", grabfood: "Delivery GrabFood", shopeefood: "Delivery ShopeeFood" };
  return order.deliveryProvider ? labels[order.deliveryProvider] ?? `Delivery ${order.deliveryProvider}` : "Delivery";
}

function aggregateOrderChannels(
  ordersInRange: Array<{ orderType: string; deliveryProvider?: string | null; total: number }>,
): OrderChannelReportRow[] {
  const byChannel = new Map<string, OrderChannelReportRow>();
  for (const order of ordersInRange) {
    const key = channelLabel(order);
    const current = byChannel.get(key) ?? { channel: key, total: 0, count: 0 };
    current.total += order.total;
    current.count += 1;
    byChannel.set(key, current);
  }
  return [...byChannel.values()].sort((a, b) => b.total - a.total || a.channel.localeCompare(b.channel));
}

function aggregatePromoDiscounts(
  ordersInRange: Array<{ promoName?: string | null; discountAmount: number }>,
): PromoDiscountReportRow[] {
  const byPromo = new Map<string, PromoDiscountReportRow>();
  for (const order of ordersInRange) {
    if (order.discountAmount <= 0) continue;
    const key = order.promoName ?? "Diskon manual/tanpa promo";
    const current = byPromo.get(key) ?? { promoName: key, amount: 0, orders: 0 };
    current.amount += order.discountAmount;
    current.orders += 1;
    byPromo.set(key, current);
  }
  return [...byPromo.values()].sort((a, b) => b.amount - a.amount || a.promoName.localeCompare(b.promoName));
}

function aggregateCashiers(
  ordersInRange: Array<{ id: string; cashierName: string; total: number }>,
  refundRows: Array<{ orderId: string; amount: number }>,
): CashierSalesReportRow[] {
  const refundByOrder = new Map<string, number>();
  for (const refund of refundRows) {
    refundByOrder.set(refund.orderId, (refundByOrder.get(refund.orderId) ?? 0) + refund.amount);
  }

  const byCashier = new Map<string, CashierSalesReportRow>();
  for (const order of ordersInRange) {
    const current = byCashier.get(order.cashierName) ?? {
      cashierName: order.cashierName,
      orders: 0,
      netSales: 0,
    };
    current.orders += 1;
    current.netSales += order.total - (refundByOrder.get(order.id) ?? 0);
    byCashier.set(order.cashierName, current);
  }
  return [...byCashier.values()].sort((a, b) => b.netSales - a.netSales || a.cashierName.localeCompare(b.cashierName));
}


function orderContextLabel(order: { orderType: string; deliveryProvider?: string | null; channelOrderName?: string | null }): string {
  if (order.orderType !== "delivery") return order.orderType;
  const providerLabels: Record<string, string> = {
    gofood: "GoFood",
    grabfood: "GrabFood",
    shopeefood: "ShopeeFood",
  };
  const provider = order.deliveryProvider ? providerLabels[order.deliveryProvider] ?? order.deliveryProvider : "delivery";
  return order.channelOrderName ? `${provider} · ${order.channelOrderName}` : provider;
}

function buildRecentOrders(
  ordersInRange: Array<{
    id: string;
    orderNo: string;
    outletName: string;
    orderType: string;
    deliveryProvider?: string | null;
    channelOrderName?: string | null;
    status: string;
    total: number;
    createdAt: string;
  }>,
  paymentRows: Array<{ orderId: string; method: string; provider?: string | null; channelLabel?: string | null }>,
): RecentOrderReportRow[] {
  const paymentByOrder = new Map<string, string>();
  for (const payment of paymentRows) {
    if (!paymentByOrder.has(payment.orderId)) {
      paymentByOrder.set(payment.orderId, paymentReportLabel(payment));
    }
  }
  return ordersInRange.slice(0, 6).map((order) => ({
    id: order.id,
    orderNo: order.orderNo,
    meta: `${order.outletName} · ${orderContextLabel(order)}`,
    amount: order.total,
    time: timeLabel(order.createdAt),
    method: paymentByOrder.get(order.id) ?? "-",
    status: order.status,
  }));
}

function buildFinanceEvents(input: {
  refundRows: Array<{ orderId: string; amount: number; reason: string; actorName: string | null; createdAt: string }>;
  orderRows: Array<{ id: string; orderNo: string; status: string; total: number; discountAmount: number; createdAt: string; cashierName: string }>;
  allOrderIds: string[];
  expenseRows: Array<{ amount: number; note: string | null; actorName: string | null; createdAt: string }>;
  orderById: Map<string, { orderNo: string }>;
}): FinanceEventReportRow[] {
  const events: FinanceEventReportRow[] = [];
  for (const refund of input.refundRows) {
    events.push({
      kind: "refund",
      amount: refund.amount,
      orderNo: input.orderById.get(refund.orderId)?.orderNo ?? refund.orderId,
      actorName: refund.actorName,
      note: refund.reason,
      createdAt: refund.createdAt,
    });
  }
  for (const order of input.orderRows.filter((row) => row.status === "void")) {
    events.push({
      kind: "void",
      amount: order.total,
      orderNo: order.orderNo,
      actorName: order.cashierName,
      note: "Order void",
      createdAt: order.createdAt,
    });
  }
  for (const order of input.orderRows.filter((row) => input.allOrderIds.includes(row.id) && row.discountAmount > 0 && isSalesOrder(row.status as OrderStatus))) {
    events.push({
      kind: "discount",
      amount: order.discountAmount,
      orderNo: order.orderNo,
      actorName: order.cashierName,
      note: "Diskon manual/order",
      createdAt: order.createdAt,
    });
  }
  for (const expense of input.expenseRows) {
    events.push({
      kind: "expense",
      amount: expense.amount,
      orderNo: expense.note ?? "Pengeluaran kas",
      actorName: expense.actorName,
      note: expense.note,
      createdAt: expense.createdAt,
    });
  }
  return events;
}

function stockStatus(quantity: number, minQuantity: number): "ok" | "low" | "out" {
  if (quantity <= 0) return "out";
  if (quantity < minQuantity) return "low";
  return "ok";
}

function dateLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", timeZone: "UTC" }).format(parsed);
}

function timeLabel(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(11, 16);
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(parsed);
}
