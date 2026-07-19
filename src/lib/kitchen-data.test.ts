/**
 * Kitchen Display integration tests (Phase 6).
 *
 * These run the real Drizzle queries against an in-memory SQLite database built
 * from committed migrations. They pin the core KDS guarantees: outlet scoping,
 * valid status transitions, actor/timestamp writes, and no duplicate ticket rows.
 */
import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import {
  roles,
  users,
  outlets,
  categories,
  products,
  shifts,
  orders,
  orderItems,
  kitchenTickets,
} from "@/db/schema";
import {
  listKitchenTickets,
  transitionKitchenTicket,
  type KitchenDb,
} from "@/lib/kitchen-data";

let db: KitchenDb;

function seed() {
  db.insert(roles).values({ id: "role_kitchen", name: "Tim Dapur" }).run();
  db.insert(users)
    .values([
      { id: "u_kitchen", name: "Rian", email: "rian@t.local", roleId: "role_kitchen" },
      { id: "u_kasir", name: "Sinta", email: "sinta@t.local", roleId: "role_kitchen" },
    ])
    .run();
  db.insert(outlets)
    .values([
      { id: "outlet_a", name: "Outlet A", code: "A" },
      { id: "outlet_b", name: "Outlet B", code: "B" },
    ])
    .run();
  db.insert(categories).values({ id: "cat_dimsum", name: "Dimsum", sortOrder: 1 }).run();
  db.insert(products)
    .values([
      {
        id: "prod_kukus",
        categoryId: "cat_dimsum",
        name: "Dimsum Ayam",
        sku: "D-1",
        price: 18000,
        costPrice: 6000,
        kitchenStation: "Kukus",
      },
      {
        id: "prod_goreng",
        categoryId: "cat_dimsum",
        name: "Lumpia Udang",
        sku: "G-1",
        price: 20000,
        costPrice: 8000,
        kitchenStation: "Goreng",
      },
    ])
    .run();
  db.insert(shifts)
    .values([
      { id: "shift_a", outletId: "outlet_a", cashierId: "u_kasir", status: "open", openingCash: 0 },
      { id: "shift_b", outletId: "outlet_b", cashierId: "u_kasir", status: "open", openingCash: 0 },
    ])
    .run();
  db.insert(orders)
    .values([
      {
        id: "order_a",
        orderNo: "TRX-A",
        outletId: "outlet_a",
        shiftId: "shift_a",
        cashierId: "u_kasir",
        orderType: "dinein",
        tableNo: "A-12",
        status: "paid",
        subtotal: 38000,
        taxAmount: 4180,
        total: 42180,
      },
      {
        id: "order_b",
        orderNo: "TRX-B",
        outletId: "outlet_b",
        shiftId: "shift_b",
        cashierId: "u_kasir",
        orderType: "takeaway",
        tableNo: "T-02",
        status: "paid",
        subtotal: 18000,
        taxAmount: 1980,
        total: 19980,
      },
    ])
    .run();
  db.insert(orderItems)
    .values([
      {
        id: "item_a1",
        orderId: "order_a",
        productId: "prod_kukus",
        nameSnapshot: "Dimsum Ayam",
        skuSnapshot: "D-1",
        priceSnapshot: 18000,
        costSnapshot: 6000,
        quantity: 1,
        note: "Sambal pisah",
      },
      {
        id: "item_a2",
        orderId: "order_a",
        productId: "prod_goreng",
        nameSnapshot: "Lumpia Udang",
        skuSnapshot: "G-1",
        priceSnapshot: 20000,
        costSnapshot: 8000,
        quantity: 1,
      },
      {
        id: "item_b1",
        orderId: "order_b",
        productId: "prod_kukus",
        nameSnapshot: "Dimsum Ayam",
        skuSnapshot: "D-1",
        priceSnapshot: 18000,
        costSnapshot: 6000,
        quantity: 1,
      },
    ])
    .run();
  db.insert(kitchenTickets)
    .values([
      { id: "ticket_a", orderId: "order_a", outletId: "outlet_a", status: "new" },
      { id: "ticket_b", orderId: "order_b", outletId: "outlet_b", status: "new" },
    ])
    .run();
}

beforeEach(() => {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  db = drizzle(sqlite) as BetterSQLite3Database<Record<string, never>> as KitchenDb;
  migrate(db as never, { migrationsFolder: "./drizzle" });
  seed();
});

describe("listKitchenTickets", () => {
  it("returns only tickets for the requested outlet", () => {
    const tickets = listKitchenTickets(db, { outletIds: ["outlet_a"] });
    expect(tickets).toHaveLength(1);
    expect(tickets[0].id).toBe("ticket_a");
    expect(tickets[0].orderNo).toBe("TRX-A");
    expect(tickets[0].items.map((item) => item.name)).toEqual(["Dimsum Ayam", "Lumpia Udang"]);
  });

  it("filters by kitchen station without duplicating multi-item tickets", () => {
    const all = listKitchenTickets(db, { outletIds: ["outlet_a"] });
    const kukus = listKitchenTickets(db, { outletIds: ["outlet_a"], station: "kukus" });
    const goreng = listKitchenTickets(db, { outletIds: ["outlet_a"], station: "goreng" });

    expect(all).toHaveLength(1);
    expect(kukus).toHaveLength(1);
    expect(goreng).toHaveLength(1);
    expect(kukus[0].id).toBe("ticket_a");
    expect(goreng[0].id).toBe("ticket_a");
  });
});

describe("transitionKitchenTicket", () => {
  it("writes actor and timestamp when a valid transition starts cooking", () => {
    const now = "2026-07-19T14:00:00.000Z";
    const updated = transitionKitchenTicket(db, {
      ticketId: "ticket_a",
      outletIds: ["outlet_a"],
      actorId: "u_kitchen",
      toStatus: "preparing",
      now,
    });

    expect(updated.status).toBe("preparing");
    const row = db.select().from(kitchenTickets).where(eq(kitchenTickets.id, "ticket_a")).get();
    expect(row?.acceptedAt).toBe(now);
    expect(row?.acceptedById).toBe("u_kitchen");
  });

  it("writes actor and timestamp for ready and completed milestones", () => {
    transitionKitchenTicket(db, {
      ticketId: "ticket_a",
      outletIds: ["outlet_a"],
      actorId: "u_kitchen",
      toStatus: "preparing",
      now: "2026-07-19T14:00:00.000Z",
    });
    transitionKitchenTicket(db, {
      ticketId: "ticket_a",
      outletIds: ["outlet_a"],
      actorId: "u_kitchen",
      toStatus: "ready",
      now: "2026-07-19T14:05:00.000Z",
    });
    transitionKitchenTicket(db, {
      ticketId: "ticket_a",
      outletIds: ["outlet_a"],
      actorId: "u_kitchen",
      toStatus: "completed",
      now: "2026-07-19T14:07:00.000Z",
    });

    const row = db.select().from(kitchenTickets).where(eq(kitchenTickets.id, "ticket_a")).get();
    expect(row?.readyAt).toBe("2026-07-19T14:05:00.000Z");
    expect(row?.readyById).toBe("u_kitchen");
    expect(row?.completedAt).toBe("2026-07-19T14:07:00.000Z");
    expect(row?.completedById).toBe("u_kitchen");
    expect(listKitchenTickets(db, { outletIds: ["outlet_a"] })).toHaveLength(0);
  });

  it("rejects invalid state transitions server-side", () => {
    expect(() =>
      transitionKitchenTicket(db, {
        ticketId: "ticket_a",
        outletIds: ["outlet_a"],
        actorId: "u_kitchen",
        toStatus: "ready",
        now: "2026-07-19T14:00:00.000Z",
      }),
    ).toThrow(/transisi status/i);
  });

  it("rejects cross-outlet ticket mutation", () => {
    expect(() =>
      transitionKitchenTicket(db, {
        ticketId: "ticket_b",
        outletIds: ["outlet_a"],
        actorId: "u_kitchen",
        toStatus: "preparing",
        now: "2026-07-19T14:00:00.000Z",
      }),
    ).toThrow(/outlet/i);
  });
});
