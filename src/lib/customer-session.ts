import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customerMembers } from "@/db/schema";
import { env } from "@/lib/env";
import {
  createCustomerSessionToken,
  verifyCustomerSessionToken,
  CUSTOMER_SESSION_COOKIE,
  CUSTOMER_SESSION_TTL_SECONDS,
  type CustomerSessionPayload,
} from "@/lib/customer-auth-core";

export interface CustomerSession {
  memberId: string;
  fullName: string;
  phone: string;
  email: string;
  pointsBalance: number;
  tier: "silver" | "gold";
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const token = (await cookies()).get(CUSTOMER_SESSION_COOKIE)?.value;
  const payload = verifyCustomerSessionToken(token, env.BETTER_AUTH_SECRET);
  if (!payload) return null;

  const member = await db
    .select({
      id: customerMembers.id,
      fullName: customerMembers.fullName,
      phone: customerMembers.phone,
      email: customerMembers.email,
      pointsBalance: customerMembers.pointsBalance,
      tier: customerMembers.tier,
    })
    .from(customerMembers)
    .where(eq(customerMembers.id, payload.memberId))
    .get();

  if (!member || member.phone !== payload.phone) return null;
  return { memberId: member.id, fullName: member.fullName, phone: member.phone, email: member.email, pointsBalance: member.pointsBalance, tier: member.tier };
}

export async function requireCustomerSession(): Promise<CustomerSession> {
  const session = await getCustomerSession();
  if (!session) redirect("/member/login");
  return session;
}

export async function setCustomerSessionCookie(payload: Omit<CustomerSessionPayload, "exp">) {
  const exp = Date.now() + CUSTOMER_SESSION_TTL_SECONDS * 1000;
  const token = createCustomerSessionToken({ ...payload, exp }, env.BETTER_AUTH_SECRET);
  (await cookies()).set(CUSTOMER_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CUSTOMER_SESSION_TTL_SECONDS,
  });
}

export async function clearCustomerSessionCookie() {
  (await cookies()).delete(CUSTOMER_SESSION_COOKIE);
}
