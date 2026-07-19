/**
 * Drizzle schema for Wanna Dimsum POS.
 *
 * Reflects the PRD "Data Model Summary" (section 15). Money is stored as
 * integer rupiah (BR-002). Every operational table carries an outlet scope
 * where relevant (BR-010). Master + financial data use soft delete / status
 * flags rather than hard delete (BR-005, BR-012).
 *
 * Frontend is mock-driven for now; this schema exists so the data layer is
 * ready when server logic lands.
 */
import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
};

// ===== Access control =====
export const roles = sqliteTable("roles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  ...timestamps,
});

export const permissions = sqliteTable("permissions", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  description: text("description"),
});

export const rolePermissions = sqliteTable(
  "role_permissions",
  {
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id),
    permissionId: text("permission_id")
      .notNull()
      .references(() => permissions.id),
  },
  (t) => [
    uniqueIndex("role_permissions_unq").on(t.roleId, t.permissionId),
  ],
);

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  username: text("username").unique(),
  passwordHash: text("password_hash").notNull(),
  pinHash: text("pin_hash"),
  roleId: text("role_id")
    .notNull()
    .references(() => roles.id),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

// ===== Outlets =====
export const outlets = sqliteTable("outlets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  address: text("address"),
  phone: text("phone"),
  timezone: text("timezone").notNull().default("Asia/Jakarta"),
  currency: text("currency").notNull().default("IDR"),
  taxPercent: real("tax_percent").notNull().default(11),
  serviceChargePercent: real("service_charge_percent").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

/** Which outlets a user may access (BR-010). */
export const userOutlets = sqliteTable(
  "user_outlets",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    outletId: text("outlet_id")
      .notNull()
      .references(() => outlets.id),
  },
  (t) => [uniqueIndex("user_outlets_unq").on(t.userId, t.outletId)],
);

// ===== Catalog =====
export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    name: text("name").notNull(),
    sku: text("sku").notNull().unique(),
    /** integer rupiah */
    price: integer("price").notNull(),
    /** integer rupiah */
    costPrice: integer("cost_price").notNull().default(0),
    kitchenStation: text("kitchen_station"),
    photoUrl: text("photo_url"),
    available: integer("available", { mode: "boolean" })
      .notNull()
      .default(true),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    ...timestamps,
  },
  (t) => [index("products_category_idx").on(t.categoryId)],
);

export const productVariants = sqliteTable("product_variants", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  name: text("name").notNull(),
  sku: text("sku").unique(),
  /** price delta in integer rupiah */
  priceDelta: integer("price_delta").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const addons = sqliteTable("addons", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  /** integer rupiah */
  price: integer("price").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

// ===== Customers =====
export const customers = sqliteTable("customers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  note: text("note"),
  ...timestamps,
});

// ===== Shifts & cash =====
export const shifts = sqliteTable(
  "shifts",
  {
    id: text("id").primaryKey(),
    outletId: text("outlet_id")
      .notNull()
      .references(() => outlets.id),
    cashierId: text("cashier_id")
      .notNull()
      .references(() => users.id),
    status: text("status", { enum: ["open", "closed"] })
      .notNull()
      .default("open"),
    /** integer rupiah */
    openingCash: integer("opening_cash").notNull().default(0),
    expectedCash: integer("expected_cash"),
    actualCash: integer("actual_cash"),
    cashDifference: integer("cash_difference"),
    closingNote: text("closing_note"),
    openedAt: text("opened_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    closedAt: text("closed_at"),
  },
  (t) => [index("shifts_outlet_idx").on(t.outletId)],
);

export const cashMovements = sqliteTable("cash_movements", {
  id: text("id").primaryKey(),
  shiftId: text("shift_id")
    .notNull()
    .references(() => shifts.id),
  type: text("type", {
    enum: ["cash_in", "cash_out", "expense", "adjustment"],
  }).notNull(),
  /** integer rupiah */
  amount: integer("amount").notNull(),
  note: text("note"),
  actorId: text("actor_id").references(() => users.id),
  ...timestamps,
});

// ===== Orders & payments =====
export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    orderNo: text("order_no").notNull().unique(),
    outletId: text("outlet_id")
      .notNull()
      .references(() => outlets.id),
    shiftId: text("shift_id")
      .notNull()
      .references(() => shifts.id),
    cashierId: text("cashier_id")
      .notNull()
      .references(() => users.id),
    customerId: text("customer_id").references(() => customers.id),
    orderType: text("order_type", {
      enum: ["dinein", "takeaway", "delivery"],
    }).notNull(),
    tableNo: text("table_no"),
    guestCount: integer("guest_count"),
    status: text("status", {
      enum: ["draft", "held", "paid", "refunded", "void"],
    })
      .notNull()
      .default("draft"),
    /** integer rupiah */
    subtotal: integer("subtotal").notNull().default(0),
    taxAmount: integer("tax_amount").notNull().default(0),
    discountAmount: integer("discount_amount").notNull().default(0),
    total: integer("total").notNull().default(0),
    note: text("note"),
    ...timestamps,
  },
  (t) => [
    index("orders_outlet_idx").on(t.outletId),
    index("orders_shift_idx").on(t.shiftId),
  ],
);

export const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id),
  productId: text("product_id").references(() => products.id),
  // Snapshot fields (BR-004)
  nameSnapshot: text("name_snapshot").notNull(),
  skuSnapshot: text("sku_snapshot"),
  variantSnapshot: text("variant_snapshot"),
  /** integer rupiah */
  priceSnapshot: integer("price_snapshot").notNull(),
  /** integer rupiah */
  costSnapshot: integer("cost_snapshot").notNull().default(0),
  quantity: integer("quantity").notNull(),
  note: text("note"),
});

export const payments = sqliteTable(
  "payments",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    /** idempotency key (BR-003) */
    idempotencyKey: text("idempotency_key").notNull().unique(),
    method: text("method", {
      enum: ["cash", "qris", "transfer", "ewallet"],
    }).notNull(),
    /** integer rupiah */
    amount: integer("amount").notNull(),
    /** integer rupiah (for cash) */
    cashReceived: integer("cash_received"),
    changeAmount: integer("change_amount"),
    referenceNo: text("reference_no"),
    status: text("status", { enum: ["pending", "success", "failed"] })
      .notNull()
      .default("success"),
    ...timestamps,
  },
  (t) => [index("payments_order_idx").on(t.orderId)],
);

export const refunds = sqliteTable("refunds", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id),
  /** integer rupiah */
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  actorId: text("actor_id")
    .notNull()
    .references(() => users.id),
  approvedById: text("approved_by_id").references(() => users.id),
  ...timestamps,
});

// ===== Kitchen =====
export const kitchenTickets = sqliteTable(
  "kitchen_tickets",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    outletId: text("outlet_id")
      .notNull()
      .references(() => outlets.id),
    station: text("station"),
    status: text("status", {
      enum: ["new", "accepted", "preparing", "ready", "completed", "cancelled"],
    })
      .notNull()
      .default("new"),
    acceptedAt: text("accepted_at"),
    readyAt: text("ready_at"),
    completedAt: text("completed_at"),
    ...timestamps,
  },
  (t) => [index("kitchen_tickets_outlet_idx").on(t.outletId)],
);

// ===== Inventory =====
export const inventoryItems = sqliteTable("inventory_items", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  category: text("category"),
  unit: text("unit").notNull(),
  /** integer rupiah unit cost */
  cost: integer("cost").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

/** Per-outlet stock levels (BR-010). */
export const outletStock = sqliteTable(
  "outlet_stock",
  {
    id: text("id").primaryKey(),
    outletId: text("outlet_id")
      .notNull()
      .references(() => outlets.id),
    inventoryItemId: text("inventory_item_id")
      .notNull()
      .references(() => inventoryItems.id),
    quantity: real("quantity").notNull().default(0),
    minQuantity: real("min_quantity").notNull().default(0),
  },
  (t) => [
    uniqueIndex("outlet_stock_unq").on(t.outletId, t.inventoryItemId),
  ],
);

export const recipes = sqliteTable("recipes", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  variantId: text("variant_id").references(() => productVariants.id),
  version: integer("version").notNull().default(1),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

export const recipeItems = sqliteTable("recipe_items", {
  id: text("id").primaryKey(),
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipes.id),
  inventoryItemId: text("inventory_item_id")
    .notNull()
    .references(() => inventoryItems.id),
  quantity: real("quantity").notNull(),
});

/** Every stock change flows through this ledger (BR-006). */
export const stockMovements = sqliteTable(
  "stock_movements",
  {
    id: text("id").primaryKey(),
    outletId: text("outlet_id")
      .notNull()
      .references(() => outlets.id),
    inventoryItemId: text("inventory_item_id")
      .notNull()
      .references(() => inventoryItems.id),
    type: text("type", {
      enum: ["in", "out", "adjustment", "waste", "sale_deduction", "opname"],
    }).notNull(),
    quantity: real("quantity").notNull(),
    note: text("note"),
    orderId: text("order_id").references(() => orders.id),
    actorId: text("actor_id").references(() => users.id),
    ...timestamps,
  },
  (t) => [index("stock_movements_outlet_idx").on(t.outletId)],
);

// ===== Discounts & audit =====
export const discounts = sqliteTable("discounts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: ["percent", "amount"] }).notNull(),
  value: integer("value").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id").references(() => users.id),
    outletId: text("outlet_id").references(() => outlets.id),
    action: text("action").notNull(),
    entity: text("entity"),
    entityId: text("entity_id"),
    detail: text("detail"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => [index("audit_logs_actor_idx").on(t.actorId)],
);
