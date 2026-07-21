import { hashPassword, verifyPassword } from "better-auth/crypto";
import { or, eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
  customerMembers,
  customerPointEvents,
} from "@/db/schema";
import {
  validateCustomerLogin,
  validateCustomerRegistration,
} from "@/lib/customer-auth-core";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CustomerPasswordAuthDb = BetterSQLite3Database<any>;

const WELCOME_POINTS = 250;

export interface RegisterCustomerMemberInput {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  marketingOptIn?: boolean;
  now?: Date;
  makeId?: () => string;
  makeEventId?: () => string;
}

export interface RegisteredCustomerMember {
  memberId: string;
  fullName: string;
  phone: string;
  email: string;
  pointsBalance: number;
}

export interface AuthenticatedCustomerMember {
  memberId: string;
  fullName: string;
  phone: string;
  email: string;
}

export async function registerCustomerMemberWithPassword(
  db: CustomerPasswordAuthDb,
  input: RegisterCustomerMemberInput,
): Promise<RegisteredCustomerMember> {
  const validation = validateCustomerRegistration(input);
  if (!validation.ok) throw new Error(validation.message);

  const existingRows = db
    .select({
      id: customerMembers.id,
      phone: customerMembers.phone,
      email: customerMembers.email,
      passwordHash: customerMembers.passwordHash,
      pointsBalance: customerMembers.pointsBalance,
    })
    .from(customerMembers)
    .where(or(eq(customerMembers.phone, validation.value.phone), eq(customerMembers.email, validation.value.email)))
    .all();

  const passwordHash = await hashPassword(validation.value.password);
  const acceptedAt = (input.now ?? new Date()).toISOString();

  if (existingRows.length > 0) {
    const hasPasswordAccount = existingRows.find((row) => row.passwordHash !== null);
    if (hasPasswordAccount) {
      if (hasPasswordAccount.phone === validation.value.phone) {
        throw new Error("Nomor HP sudah terdaftar. Silakan login.");
      }
      if (hasPasswordAccount.email === validation.value.email) {
        throw new Error("Email sudah terdaftar. Silakan login.");
      }
    }

    // None of the matching rows have a password (unclaimed cashier/POS accounts).
    // Claim the first matching one.
    const existing = existingRows[0];
    db.transaction((tx) => {
      tx.update(customerMembers)
        .set({
          fullName: validation.value.fullName,
          phone: validation.value.phone,
          email: validation.value.email,
          passwordHash,
          termsAcceptedAt: acceptedAt,
          privacyAcceptedAt: acceptedAt,
          marketingOptIn: input.marketingOptIn ?? false,
          updatedAt: acceptedAt,
        })
        .where(eq(customerMembers.id, existing.id))
        .run();
    });

    return {
      memberId: existing.id,
      fullName: validation.value.fullName,
      phone: validation.value.phone,
      email: validation.value.email,
      pointsBalance: existing.pointsBalance ?? WELCOME_POINTS,
    };
  }

  const memberId = input.makeId?.() ?? crypto.randomUUID();
  const eventId = input.makeEventId?.() ?? crypto.randomUUID();

  db.transaction((tx) => {
    tx.insert(customerMembers).values({
      id: memberId,
      fullName: validation.value.fullName,
      phone: validation.value.phone,
      email: validation.value.email,
      passwordHash,
      termsAcceptedAt: acceptedAt,
      privacyAcceptedAt: acceptedAt,
      marketingOptIn: input.marketingOptIn ?? false,
      pointsBalance: WELCOME_POINTS,
      tier: "silver",
    }).run();
    tx.insert(customerPointEvents).values({
      id: eventId,
      memberId,
      kind: "bonus",
      points: WELCOME_POINTS,
      note: "Bonus selamat datang Wanna Rewards",
    }).run();
  });

  return {
    memberId,
    fullName: validation.value.fullName,
    phone: validation.value.phone,
    email: validation.value.email,
    pointsBalance: WELCOME_POINTS,
  };
}

export async function authenticateCustomerMember(
  db: CustomerPasswordAuthDb,
  input: { email: string; password: string },
): Promise<AuthenticatedCustomerMember> {
  const validation = validateCustomerLogin(input);
  if (!validation.ok) throw new Error(validation.message);

  const member = db
    .select({
      id: customerMembers.id,
      fullName: customerMembers.fullName,
      phone: customerMembers.phone,
      email: customerMembers.email,
      passwordHash: customerMembers.passwordHash,
    })
    .from(customerMembers)
    .where(eq(customerMembers.email, validation.email))
    .get();

  if (!member?.passwordHash) throw new Error("Email atau password salah.");
  const valid = await verifyPassword({ hash: member.passwordHash, password: validation.password });
  if (!valid) throw new Error("Email atau password salah.");

  return {
    memberId: member.id,
    fullName: member.fullName,
    phone: member.phone,
    email: member.email,
  };
}
