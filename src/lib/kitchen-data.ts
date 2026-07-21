/**
 * Kitchen Display data access (Phase 6).
 *
 * DB-parameterized like `order-core.ts`, so integration tests can run against an
 * in-memory SQLite database with real migrations. The server-only wrapper binds
 * this to the singleton app DB.
 */
import { asc, eq, inArray } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
  kitchenTickets,
  orderItems,
  orders,
  products,
} from "@/db/schema";
import {
  assertKitchenTransition,
  normalizeKitchenStation,
  toBoardStatus,
  type KitchenBoardStatus,
  type KitchenStation,
  type KitchenStationFilter,
  type KitchenStatus,
} from "@/lib/kitchen-core";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type KitchenDb = BetterSQLite3Database<any>;

export interface KitchenTicketItem {
  name: string;
  quantity: number;
  note: string | null;
  station: KitchenStation | null;
}

export interface KitchenTicketView {
  id: string;
  orderId: string;
  orderNo: string;
  outletId: string;
  orderType: "dinein" | "takeaway" | "delivery";
  slot: string;
  customerName: string | null;
  deliveryProvider: "gofood" | "grabfood" | "shopeefood" | null;
  channelOrderName: string | null;
  contextLabel: string;
  status: KitchenStatus;
  boardStatus: KitchenBoardStatus;
  createdAt: string;
  acceptedAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
  acceptedById: string | null;
  readyById: string | null;
  completedById: string | null;
  station: KitchenStation | null;
  items: KitchenTicketItem[];
}

export interface ListKitchenTicketsInput {
  outletIds: string[];
  station?: KitchenStationFilter;
}

export interface TransitionKitchenTicketInput {
  ticketId: string;
  outletIds: string[];
  actorId: string;
  toStatus: KitchenStatus;
  now?: string;
}

export function listKitchenTickets(
  db: KitchenDb,
  input: ListKitchenTicketsInput,
): KitchenTicketView[] {
  if (input.outletIds.length === 0) return [];

  const rows = db
    .select({
      id: kitchenTickets.id,
      orderId: kitchenTickets.orderId,
      outletId: kitchenTickets.outletId,
      ticketStation: kitchenTickets.station,
      status: kitchenTickets.status,
      createdAt: kitchenTickets.createdAt,
      acceptedAt: kitchenTickets.acceptedAt,
      readyAt: kitchenTickets.readyAt,
      completedAt: kitchenTickets.completedAt,
      acceptedById: kitchenTickets.acceptedById,
      readyById: kitchenTickets.readyById,
      completedById: kitchenTickets.completedById,
      orderNo: orders.orderNo,
      orderType: orders.orderType,
      tableNo: orders.tableNo,
      customerName: orders.customerName,
      deliveryProvider: orders.deliveryProvider,
      channelOrderName: orders.channelOrderName,
    })
    .from(kitchenTickets)
    .innerJoin(orders, eq(kitchenTickets.orderId, orders.id))
    .where(inArray(kitchenTickets.outletId, input.outletIds))
    .orderBy(asc(kitchenTickets.createdAt), asc(kitchenTickets.id))
    .all();

  const activeRows = rows.filter((r) => toBoardStatus(r.status) !== null);
  if (activeRows.length === 0) return [];

  const orderIds = activeRows.map((r) => r.orderId);
  const itemRows = db
    .select({
      orderId: orderItems.orderId,
      name: orderItems.nameSnapshot,
      quantity: orderItems.quantity,
      note: orderItems.note,
      productStation: products.kitchenStation,
    })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(inArray(orderItems.orderId, orderIds))
    .all();

  const byOrder = new Map<string, KitchenTicketItem[]>();
  for (const item of itemRows) {
    const list = byOrder.get(item.orderId) ?? [];
    list.push({
      name: item.name,
      quantity: item.quantity,
      note: item.note,
      station: normalizeKitchenStation(item.productStation),
    });
    byOrder.set(item.orderId, list);
  }

  const stationFilter = input.station && input.station !== "all" ? input.station : null;

  return activeRows
    .map((r): KitchenTicketView => {
      const items = byOrder.get(r.orderId) ?? [];
      const ticketStation = normalizeKitchenStation(r.ticketStation);
      const station = ticketStation ?? items.find((it) => it.station)?.station ?? null;
      return {
        id: r.id,
        orderId: r.orderId,
        orderNo: r.orderNo,
        outletId: r.outletId,
        orderType: r.orderType,
        slot: slotForOrder(r.orderType, r.tableNo, r.orderNo, r.channelOrderName),
        customerName: r.customerName,
        deliveryProvider: r.deliveryProvider,
        channelOrderName: r.channelOrderName,
        contextLabel: contextForOrder(r.orderType, r.tableNo, r.customerName, r.deliveryProvider, r.channelOrderName),
        status: r.status,
        boardStatus: toBoardStatus(r.status) as KitchenBoardStatus,
        createdAt: r.createdAt,
        acceptedAt: r.acceptedAt,
        readyAt: r.readyAt,
        completedAt: r.completedAt,
        acceptedById: r.acceptedById,
        readyById: r.readyById,
        completedById: r.completedById,
        station,
        items,
      };
    })
    .filter((ticket) => {
      if (!stationFilter) return true;
      return ticket.station === stationFilter || ticket.items.some((it) => it.station === stationFilter);
    });
}

export function transitionKitchenTicket(
  db: KitchenDb,
  input: TransitionKitchenTicketInput,
): KitchenTicketView {
  const now = input.now ?? new Date().toISOString();
  const current = db
    .select()
    .from(kitchenTickets)
    .where(eq(kitchenTickets.id, input.ticketId))
    .get();

  if (!current) {
    throw new Error("Ticket dapur tidak ditemukan.");
  }
  if (!input.outletIds.includes(current.outletId)) {
    throw new Error("Ticket dapur di luar outlet Anda.");
  }

  assertKitchenTransition(current.status, input.toStatus);

  const patch: Partial<typeof kitchenTickets.$inferInsert> = {
    status: input.toStatus,
  };

  if (input.toStatus === "accepted" || input.toStatus === "preparing") {
    patch.acceptedAt = now;
    patch.acceptedById = input.actorId;
  }
  if (input.toStatus === "ready") {
    patch.readyAt = now;
    patch.readyById = input.actorId;
  }
  if (input.toStatus === "completed") {
    patch.completedAt = now;
    patch.completedById = input.actorId;
  }

  db.update(kitchenTickets).set(patch).where(eq(kitchenTickets.id, input.ticketId)).run();

  const [updated] = listKitchenTickets(db, {
    outletIds: input.outletIds,
  }).filter((ticket) => ticket.id === input.ticketId);

  if (updated) return updated;

  return {
    id: current.id,
    orderId: current.orderId,
    orderNo: "",
    outletId: current.outletId,
    orderType: "takeaway",
    slot: "",
    customerName: null,
    deliveryProvider: null,
    channelOrderName: null,
    contextLabel: "Takeaway",
    status: input.toStatus,
    boardStatus: "siap",
    createdAt: current.createdAt,
    acceptedAt: patch.acceptedAt ?? current.acceptedAt,
    readyAt: patch.readyAt ?? current.readyAt,
    completedAt: patch.completedAt ?? current.completedAt,
    acceptedById: patch.acceptedById ?? current.acceptedById,
    readyById: patch.readyById ?? current.readyById,
    completedById: patch.completedById ?? current.completedById,
    station: normalizeKitchenStation(current.station),
    items: [],
  };
}

const PROVIDER_LABEL: Record<"gofood" | "grabfood" | "shopeefood", string> = {
  gofood: "GoFood",
  grabfood: "GrabFood",
  shopeefood: "ShopeeFood",
};

function slotForOrder(
  orderType: "dinein" | "takeaway" | "delivery",
  tableNo: string | null,
  orderNo: string,
  channelOrderName?: string | null,
): string {
  if (orderType === "dinein") return tableNo ? `Meja ${tableNo}` : "Dine-in";
  if (orderType === "takeaway") return "Takeaway";
  return channelOrderName ?? `Delivery ${orderNo}`;
}

function contextForOrder(
  orderType: "dinein" | "takeaway" | "delivery",
  tableNo: string | null,
  customerName: string | null,
  deliveryProvider: "gofood" | "grabfood" | "shopeefood" | null,
  channelOrderName: string | null,
): string {
  if (orderType === "dinein") {
    return [tableNo ? `Meja ${tableNo}` : "Dine-in", customerName ? `a.n. ${customerName}` : null]
      .filter(Boolean)
      .join(" · ");
  }
  if (orderType === "takeaway") {
    return customerName ? `Takeaway · a.n. ${customerName}` : "Takeaway";
  }
  const provider = deliveryProvider ? PROVIDER_LABEL[deliveryProvider] : "Delivery";
  return [provider, channelOrderName].filter(Boolean).join(" · ");
}
