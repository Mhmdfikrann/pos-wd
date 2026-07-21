"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  authenticateCustomerMember,
  registerCustomerMemberWithPassword,
} from "@/lib/customer-password-auth";
import { redeemCustomerReward } from "@/lib/customer-redemption";
import { clearCustomerSessionCookie, requireCustomerSession, setCustomerSessionCookie } from "@/lib/customer-session";

export type RedeemRewardActionState =
  | { ok: true; message: string; pointsBalance: number; voucherCode: string }
  | { ok: false; error: string }
  | null;

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function errorRedirect(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function registerCustomerAction(formData: FormData) {
  try {
    await registerCustomerMemberWithPassword(db, {
      fullName: field(formData, "fullName"),
      phone: field(formData, "phone"),
      email: field(formData, "email"),
      password: field(formData, "password"),
      termsAccepted: formData.get("termsAccepted") === "on" || formData.get("termsAccepted") === "true",
      privacyAccepted: formData.get("privacyAccepted") === "on" || formData.get("privacyAccepted") === "true",
      marketingOptIn: formData.get("marketingOptIn") === "on" || formData.get("marketingOptIn") === "true",
    });
  } catch (err) {
    errorRedirect("/member/register", err instanceof Error ? err.message : "Gagal membuat akun member.");
  }

  redirect("/member/login?notice=Akun%20berhasil%20dibuat.%20Silakan%20login%20dengan%20email%20dan%20password.");
}

export async function startCustomerLoginAction(formData: FormData) {
  let member: Awaited<ReturnType<typeof authenticateCustomerMember>>;
  try {
    member = await authenticateCustomerMember(db, {
      email: field(formData, "email"),
      password: field(formData, "password"),
    });
  } catch (err) {
    errorRedirect("/member/login", err instanceof Error ? err.message : "Login member gagal.");
  }

  await setCustomerSessionCookie({ memberId: member.memberId, phone: member.phone });
  redirect("/member");
}

export async function logoutCustomerAction() {
  await clearCustomerSessionCookie();
  redirect("/member/login");
}

export async function redeemRewardAction(
  _prevState: RedeemRewardActionState,
  formData: FormData,
): Promise<RedeemRewardActionState> {
  const session = await requireCustomerSession();
  const rewardId = field(formData, "rewardId");
  if (!rewardId) return { ok: false, error: "Reward tidak ditemukan." };

  try {
    const result = redeemCustomerReward(db, {
      memberId: session.memberId,
      rewardId,
    });
    revalidatePath("/member");
    return {
      ok: true,
      message: `Reward berhasil ditukar. Kode voucher: ${result.code}`,
      pointsBalance: result.pointsBalance,
      voucherCode: result.code,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Reward gagal ditukar.",
    };
  }
}
