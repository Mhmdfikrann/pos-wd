/**
 * Seed script for Wanna Dimsum POS.
 *
 * Creates the five PRD roles (6.1-6.5), a starter permission set, a default
 * outlet, and one user per role.
 *
 * Users are inserted directly via drizzle (not better-auth's signUp API) because
 * our canonical `users` table has a NOT NULL `role_id` that better-auth's signup
 * flow doesn't populate. To keep sign-in working, passwords are hashed with
 * better-auth's OWN `hashPassword` (scrypt envelope) and written to a matching
 * `account` row (providerId "credential"), exactly as a real sign-up would.
 *
 * Run: `npm run db:seed`  (idempotent — safe to run repeatedly)
 */
import { hashPassword } from "better-auth/crypto";
import { db } from "./index";
import {
  roles,
  permissions,
  rolePermissions,
  outlets,
  users,
  userOutlets,
  accounts,
} from "./schema";

// ---- Role catalog (PRD 6.1-6.5) ----
const ROLES = [
  { id: "role_owner", name: "Owner", description: "Akses penuh semua modul & outlet (PRD 6.1)" },
  { id: "role_manager", name: "Manager Outlet", description: "Operasional & approval per outlet (PRD 6.2)" },
  { id: "role_kasir", name: "Kasir", description: "Transaksi pada outlet & shift aktif (PRD 6.3)" },
  { id: "role_kitchen", name: "Tim Dapur", description: "Kitchen display & status pesanan (PRD 6.4)" },
  { id: "role_inventory", name: "Staf Inventory", description: "Kelola stok outlet (PRD 6.5)" },
];

// ---- Permission keys (coarse MVP set; refine per phase) ----
const PERMISSIONS = [
  "pos.operate",
  "shift.open",
  "shift.close",
  "payment.accept",
  "refund.request",
  "refund.approve",
  "void.approve",
  "discount.apply",
  "kitchen.view",
  "kitchen.update",
  "inventory.view",
  "inventory.adjust",
  "report.view",
  "catalog.manage",
  "user.manage",
  "outlet.manage",
  "audit.view",
];

// role -> permission keys
const ROLE_PERMS: Record<string, string[]> = {
  role_owner: PERMISSIONS, // everything
  role_manager: [
    "pos.operate", "shift.open", "shift.close", "payment.accept",
    "refund.approve", "void.approve", "discount.apply",
    "kitchen.view", "inventory.view", "inventory.adjust", "report.view",
  ],
  role_kasir: [
    "pos.operate", "shift.open", "shift.close", "payment.accept",
    "refund.request", "discount.apply",
  ],
  role_kitchen: ["kitchen.view", "kitchen.update"],
  role_inventory: ["inventory.view", "inventory.adjust", "report.view"],
};

// ---- Users (one per role). Passwords/PINs are dev defaults — rotate for prod. ----
const USERS = [
  { id: "user_owner", name: "Andi Wijaya", email: "owner@wannadimsum.local", username: "owner", password: "owner12345", roleId: "role_owner", pin: "1111" },
  { id: "user_manager", name: "Rina Hartati", email: "manager@wannadimsum.local", username: "manager", password: "manager12345", roleId: "role_manager", pin: "2222" },
  { id: "user_kasir", name: "Sinta Dewi", email: "kasir@wannadimsum.local", username: "kasir", password: "kasir12345", roleId: "role_kasir", pin: "3333" },
  { id: "user_kitchen", name: "Budi Santoso", email: "kitchen@wannadimsum.local", username: "kitchen", password: "kitchen12345", roleId: "role_kitchen", pin: "4444" },
  { id: "user_inventory", name: "Dewi Lestari", email: "inventory@wannadimsum.local", username: "inventory", password: "inventory12345", roleId: "role_inventory", pin: "5555" },
];

const OUTLET_ID = "outlet_kemang";

async function main() {
  console.log("Seeding roles...");
  for (const r of ROLES) {
    await db.insert(roles).values(r).onConflictDoNothing();
  }

  console.log("Seeding permissions...");
  const permIds: Record<string, string> = {};
  for (const key of PERMISSIONS) {
    const id = `perm_${key.replace(/\./g, "_")}`;
    permIds[key] = id;
    await db.insert(permissions).values({ id, key }).onConflictDoNothing();
  }

  console.log("Linking role permissions...");
  for (const [roleId, keys] of Object.entries(ROLE_PERMS)) {
    for (const key of keys) {
      await db
        .insert(rolePermissions)
        .values({ roleId, permissionId: permIds[key] })
        .onConflictDoNothing();
    }
  }

  console.log("Seeding default outlet...");
  await db
    .insert(outlets)
    .values({
      id: OUTLET_ID,
      name: "Outlet Kemang",
      code: "KMG",
      address: "Jl. Kemang Raya No. 1, Jakarta Selatan",
      phone: "021-1234567",
    })
    .onConflictDoNothing();

  console.log("Seeding users (drizzle + better-auth scrypt hash)...");
  for (const u of USERS) {
    const passwordHash = await hashPassword(u.password);
    const pinHash = await hashPassword(u.pin);

    await db
      .insert(users)
      .values({
        id: u.id,
        name: u.name,
        email: u.email,
        emailVerified: true,
        username: u.username,
        displayUsername: u.username,
        pinHash,
        roleId: u.roleId,
        active: true,
      })
      .onConflictDoNothing();

    // Credential account row — this is what better-auth checks on sign-in.
    await db
      .insert(accounts)
      .values({
        id: `acct_${u.id}`,
        userId: u.id,
        accountId: u.id,
        providerId: "credential",
        password: passwordHash,
      })
      .onConflictDoNothing();

    // Grant access to the default outlet (BR-010).
    await db
      .insert(userOutlets)
      .values({ userId: u.id, outletId: OUTLET_ID })
      .onConflictDoNothing();
  }

  console.log("\nSeed complete. Login credentials (dev):");
  for (const u of USERS) {
    console.log(`  ${u.username.padEnd(10)} / ${u.password.padEnd(16)} (PIN ${u.pin}) — ${u.name}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
