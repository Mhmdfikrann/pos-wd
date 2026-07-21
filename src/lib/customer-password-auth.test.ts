import { beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import {
  customerMembers,
  customerOtpAttempts,
  customerPointEvents,
} from "@/db/schema";
import {
  authenticateCustomerMember,
  registerCustomerMemberWithPassword,
  type CustomerPasswordAuthDb,
} from "./customer-password-auth";

let db: CustomerPasswordAuthDb;

beforeEach(() => {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  db = drizzle(sqlite) as BetterSQLite3Database<Record<string, never>> as CustomerPasswordAuthDb;
  migrate(db as never, { migrationsFolder: "./drizzle" });
});

describe("customer email/password auth", () => {
  it("registers a member with hashed password and welcome points without OTP", async () => {
    const result = await registerCustomerMemberWithPassword(db, {
      fullName: " Budi   Santoso ",
      phone: "081234567890",
      email: "BUDI@EXAMPLE.COM",
      password: "rahasia123",
      termsAccepted: true,
      privacyAccepted: true,
      marketingOptIn: true,
      makeId: () => "member_1",
      makeEventId: () => "event_1",
      now: new Date("2026-07-21T10:00:00.000Z"),
    });

    expect(result).toEqual({
      memberId: "member_1",
      fullName: "Budi Santoso",
      phone: "6281234567890",
      email: "budi@example.com",
      pointsBalance: 250,
    });
    const member = db.select().from(customerMembers).where(eq(customerMembers.id, "member_1")).get();
    expect(member).toMatchObject({
      fullName: "Budi Santoso",
      phone: "6281234567890",
      email: "budi@example.com",
      pointsBalance: 250,
      tier: "silver",
      marketingOptIn: true,
    });
    expect(member?.passwordHash).toBeTruthy();
    expect(member?.passwordHash).not.toBe("rahasia123");
    expect(db.select().from(customerPointEvents).where(eq(customerPointEvents.id, "event_1")).get()).toMatchObject({
      memberId: "member_1",
      kind: "bonus",
      points: 250,
      note: "Bonus selamat datang Wanna Rewards",
    });
    expect(db.select().from(customerOtpAttempts).all()).toHaveLength(0);
  });

  it("authenticates by email and password and rejects wrong credentials", async () => {
    await registerCustomerMemberWithPassword(db, {
      fullName: "Budi Santoso",
      phone: "081234567890",
      email: "budi@example.com",
      password: "rahasia123",
      termsAccepted: true,
      privacyAccepted: true,
      makeId: () => "member_1",
      makeEventId: () => "event_1",
      now: new Date("2026-07-21T10:00:00.000Z"),
    });

    await expect(authenticateCustomerMember(db, {
      email: "BUDI@EXAMPLE.COM",
      password: "rahasia123",
    })).resolves.toMatchObject({
      memberId: "member_1",
      email: "budi@example.com",
      phone: "6281234567890",
    });

    await expect(authenticateCustomerMember(db, {
      email: "budi@example.com",
      password: "salah123",
    })).rejects.toThrow("Email atau password salah.");
  });

  it("allows claiming an existing member account (unclaimed, with null passwordHash)", async () => {
    // 1. Seed an unclaimed member (e.g. from cashier POS)
    const mockNow = new Date("2026-07-21T10:00:00.000Z");
    db.insert(customerMembers).values({
      id: "unclaimed_member_1",
      fullName: "Mohammad Fikran",
      phone: "6281363899584",
      email: "fikran273@gmail.com",
      passwordHash: null,
      termsAcceptedAt: mockNow.toISOString(),
      privacyAcceptedAt: mockNow.toISOString(),
      marketingOptIn: true,
      pointsBalance: 500,
      tier: "silver",
      createdAt: mockNow.toISOString(),
      updatedAt: mockNow.toISOString(),
    }).run();

    // 2. Try to register with the same phone/email but with a password
    const result = await registerCustomerMemberWithPassword(db, {
      fullName: "Mohammad Fikran",
      phone: "081363899584",
      email: "fikran273@gmail.com",
      password: "newpassword123",
      termsAccepted: true,
      privacyAccepted: true,
      marketingOptIn: true,
      now: new Date("2026-07-21T11:00:00.000Z"),
    });

    // 3. Verify that the result returned the correct member ID and kept points
    expect(result).toEqual({
      memberId: "unclaimed_member_1",
      fullName: "Mohammad Fikran",
      phone: "6281363899584",
      email: "fikran273@gmail.com",
      pointsBalance: 500,
    });

    // 4. Verify DB was updated
    const member = db.select().from(customerMembers).where(eq(customerMembers.id, "unclaimed_member_1")).get();
    expect(member?.passwordHash).toBeTruthy();
    expect(member?.passwordHash).not.toBeNull();

    // 5. Verify we can login now
    const loginResult = await authenticateCustomerMember(db, {
      email: "fikran273@gmail.com",
      password: "newpassword123",
    });
    expect(loginResult.memberId).toBe("unclaimed_member_1");
  });
}, 20000);
