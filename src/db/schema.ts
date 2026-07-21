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

// better-auth timestamps: epoch integers (mode: "timestamp") because
// better-auth passes Date objects. Kept distinct from the text-based `timestamps`
// used by domain tables. Defined here so the canonical `users` table can use it.
const baTimestamps = {
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
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

/**
 * Canonical user table (BR — access control). better-auth is layered on top of
 * this table via the drizzle adapter's schema remap (`user: schema.users` in
 * src/lib/auth.ts), so the 8 existing FKs that point at `users.id` stay intact
 * instead of splitting into a parallel better-auth `user` table.
 *
 * Columns fall into two groups:
 *  - Domain columns (roleId, pinHash, active) — owned by our RBAC layer.
 *  - better-auth columns (emailVerified, image, displayUsername) — required by
 *    the adapter. Credentials live in `account` (providerId "credential"),
 *    NOT here; `passwordHash` is kept nullable only for legacy seed migration.
 */
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  /** Legacy/optional — real credential hash lives in `account.password`. */
  passwordHash: text("password_hash"),
  pinHash: text("pin_hash"),
  roleId: text("role_id")
    .notNull()
    .references(() => roles.id),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  // better-auth writes Date objects here, so these must be integer timestamps
  // (NOT the text `timestamps` used by domain tables) or better-sqlite3 throws
  // when binding a Date to a TEXT column during sign-up.
  ...baTimestamps,
});

// ===== better-auth tables (session / account / verification) =====
// Shapes follow `npx @better-auth/cli generate`. Timestamps are epoch-ms
// integers (mode: "timestamp") because better-auth passes Date objects.

export const sessions = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    ...baTimestamps,
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const accounts = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    /** credential hash for email/username+password (better-auth scrypt) */
    password: text("password"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp",
    }),
    scope: text("scope"),
    ...baTimestamps,
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verifications = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    ...baTimestamps,
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

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


// ===== Customer app / Wanna Rewards (public member identity) =====
// Deliberately separate from internal POS `users` / better-auth. Customers use
// email/password and a distinct cookie (see src/lib/customer-session.ts).
export const customerMembers = sqliteTable(
  "customer_members",
  {
    id: text("id").primaryKey(),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    /** Customer app credential hash. Separate from internal better-auth account rows. */
    passwordHash: text("password_hash"),
    termsAcceptedAt: text("terms_accepted_at").notNull(),
    privacyAcceptedAt: text("privacy_accepted_at").notNull(),
    marketingOptIn: integer("marketing_opt_in", { mode: "boolean" })
      .notNull()
      .default(false),
    pointsBalance: integer("points_balance").notNull().default(0),
    tier: text("tier", { enum: ["silver", "gold"] })
      .notNull()
      .default("silver"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("customer_members_phone_unq").on(t.phone),
    uniqueIndex("customer_members_email_unq").on(t.email),
  ],
);

export const customerOtpAttempts = sqliteTable(
  "customer_otp_attempts",
  {
    id: text("id").primaryKey(),
    phone: text("phone").notNull(),
    purpose: text("purpose", { enum: ["register", "login"] }).notNull(),
    codeHash: text("code_hash"),
    expiresAt: text("expires_at").notNull(),
    verifiedAt: text("verified_at"),
    ...timestamps,
  },
  (t) => [index("customer_otp_phone_idx").on(t.phone)],
);

export const customerPointEvents = sqliteTable(
  "customer_point_events",
  {
    id: text("id").primaryKey(),
    memberId: text("member_id")
      .notNull()
      .references(() => customerMembers.id, { onDelete: "cascade" }),
    kind: text("kind", {
      enum: ["bonus", "earn", "redeem", "adjust"],
    }).notNull(),
    points: integer("points").notNull(),
    sourceOrderId: text("source_order_id").references(() => orders.id),
    sourceVoucherId: text("source_voucher_id"),
    note: text("note"),
    ...timestamps,
  },
  (t) => [index("customer_point_events_member_idx").on(t.memberId)],
);

export const customerRewards = sqliteTable("customer_rewards", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category", {
    enum: ["voucher", "paket", "gratis", "ongkir"],
  }).notNull(),
  pointsCost: integer("points_cost").notNull(),
  description: text("description"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

export const customerVouchers = sqliteTable(
  "customer_vouchers",
  {
    id: text("id").primaryKey(),
    memberId: text("member_id")
      .notNull()
      .references(() => customerMembers.id, { onDelete: "cascade" }),
    rewardId: text("reward_id").references(() => customerRewards.id),
    code: text("code").notNull(),
    status: text("status", {
      enum: ["active", "used", "expired"],
    })
      .notNull()
      .default("active"),
    issuedAt: text("issued_at").notNull(),
    expiresAt: text("expires_at").notNull(),
    usedOrderId: text("used_order_id").references(() => orders.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("customer_vouchers_code_unq").on(t.code),
    index("customer_vouchers_member_idx").on(t.memberId),
  ],
);

export const customerPromos = sqliteTable("customer_promos", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  badge: text("badge"),
  startsAt: text("starts_at"),
  endsAt: text("ends_at"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
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
  (t) => [
    index("shifts_outlet_idx").on(t.outletId),
    // BR-008: at most one OPEN shift per (outlet, cashier). Partial unique index
    // so historical closed shifts don't collide — a cashier accumulates many
    // closed shifts over time, but only ever one open. This is the hard DB-level
    // guard behind the service-layer check in shift.ts.
    uniqueIndex("shifts_one_open_unq")
      .on(t.outletId, t.cashierId)
      .where(sql`${t.status} = 'open'`),
  ],
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
    customerMemberId: text("customer_member_id").references(() => customerMembers.id),
    /** Phone snapshot for customer-app member link at checkout time. */
    customerPhone: text("customer_phone"),
    orderType: text("order_type", {
      enum: ["dinein", "takeaway", "delivery"],
    }).notNull(),
    tableNo: text("table_no"),
    /** Snapshot name typed by cashier for dine-in/takeaway calls and receipts. */
    customerName: text("customer_name"),
    deliveryProvider: text("delivery_provider", {
      enum: ["gofood", "grabfood", "shopeefood"],
    }),
    /** Marketplace/customer-visible order name/code for delivery channels. */
    channelOrderName: text("channel_order_name"),
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
    promoId: text("promo_id").references(() => discounts.id),
    promoNameSnapshot: text("promo_name_snapshot"),
    total: integer("total").notNull().default(0),
    note: text("note"),
    ...timestamps,
  },
  (t) => [
    index("orders_outlet_idx").on(t.outletId),
    index("orders_shift_idx").on(t.shiftId),
    index("orders_customer_member_idx").on(t.customerMemberId),
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
      enum: ["cash", "qris", "transfer", "ewallet", "card"],
    }).notNull(),
    /** integer rupiah */
    amount: integer("amount").notNull(),
    /** integer rupiah (for cash) */
    cashReceived: integer("cash_received"),
    changeAmount: integer("change_amount"),
    provider: text("provider"),
    channelLabel: text("channel_label"),
    referenceNo: text("reference_no"),
    lineNo: integer("line_no"),
    requestIdempotencyKey: text("request_idempotency_key"),
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

// ===== Manager approvals =====
export const approvalRequests = sqliteTable(
  "approval_requests",
  {
    id: text("id").primaryKey(),
    outletId: text("outlet_id")
      .notNull()
      .references(() => outlets.id),
    kind: text("kind", { enum: ["refund", "void", "discount"] }).notNull(),
    status: text("status", { enum: ["pending", "approved", "rejected"] })
      .notNull()
      .default("pending"),
    targetOrderId: text("target_order_id")
      .notNull()
      .references(() => orders.id),
    amount: integer("amount"),
    reason: text("reason").notNull(),
    payload: text("payload"),
    requestedById: text("requested_by_id")
      .notNull()
      .references(() => users.id),
    approvedById: text("approved_by_id").references(() => users.id),
    rejectedById: text("rejected_by_id").references(() => users.id),
    resolvedAt: text("resolved_at"),
    ...timestamps,
  },
  (t) => [
    index("approval_requests_outlet_status_idx").on(t.outletId, t.status),
    index("approval_requests_order_idx").on(t.targetOrderId),
  ],
);

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
    acceptedById: text("accepted_by_id").references(() => users.id),
    readyAt: text("ready_at"),
    readyById: text("ready_by_id").references(() => users.id),
    completedAt: text("completed_at"),
    completedById: text("completed_by_id").references(() => users.id),
    ...timestamps,
  },
  (t) => [
    index("kitchen_tickets_outlet_idx").on(t.outletId),
    // Exactly one kitchen ticket per order (Phase 5 checkout creates it inside
    // the payment transaction). This unique index is the hard "exactly once"
    // guard — a retried/racing checkout can't spawn a duplicate ticket.
    uniqueIndex("kitchen_tickets_order_unq").on(t.orderId),
  ],
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
  (t) => [
    index("stock_movements_outlet_idx").on(t.outletId),
    // Phase 7: sale deduction is tied to an order and must be idempotent.
    // Manual movements can repeat, but a given order may only deduct each
    // ingredient once.
    uniqueIndex("stock_sale_deduction_unq")
      .on(t.orderId, t.inventoryItemId, t.type)
      .where(sql`${t.type} = 'sale_deduction' and ${t.orderId} is not null`),
  ],
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
