import crypto from "node:crypto";

export const CUSTOMER_SESSION_COOKIE = "wd_customer_session";
export const CUSTOMER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export interface CustomerSessionPayload {
  memberId: string;
  phone: string;
  exp: number;
}

function normalizeCustomerEmail(input: string): string {
  return input.trim().toLowerCase();
}

function validatePassword(input: string): string | null {
  if (input.length < 8) return "Password minimal 8 karakter.";
  return null;
}

export function normalizeCustomerPhone(input: string): string {
  const raw = input.trim();
  if (!raw) return "";
  let digits = raw.replace(/[^0-9+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

export function validateCustomerRegistration(input: {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
}): { ok: true; value: { fullName: string; phone: string; email: string; password: string } } | { ok: false; message: string } {
  const fullName = input.fullName.trim().replace(/\s+/g, " ");
  const phone = normalizeCustomerPhone(input.phone);
  const email = normalizeCustomerEmail(input.email);
  const password = input.password;

  if (fullName.length < 3) return { ok: false, message: "Nama lengkap minimal 3 karakter." };
  if (!/^62\d{8,13}$/.test(phone)) return { ok: false, message: "Nomor HP harus valid, contoh 081234567890." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "Email harus valid." };
  const passwordError = validatePassword(password);
  if (passwordError) return { ok: false, message: passwordError };
  if (!input.termsAccepted || !input.privacyAccepted) {
    return { ok: false, message: "Syarat layanan dan kebijakan privasi wajib disetujui." };
  }

  return { ok: true, value: { fullName, phone, email, password } };
}

export function validateCustomerLogin(input: { email: string; password: string }): { ok: true; email: string; password: string } | { ok: false; message: string } {
  const email = normalizeCustomerEmail(input.email);
  const password = input.password;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "Email harus valid." };
  const passwordError = validatePassword(password);
  if (passwordError) return { ok: false, message: passwordError };
  return { ok: true, email, password };
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(value: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

export function createCustomerSessionToken(payload: CustomerSessionPayload, secret: string): string {
  const body = base64url(JSON.stringify(payload));
  return `${body}.${sign(body, secret)}`;
}

export function verifyCustomerSessionToken(token: string | undefined, secret: string, now = Date.now()): CustomerSessionPayload | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = sign(body, secret);
  const given = Buffer.from(signature);
  const want = Buffer.from(expected);
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<CustomerSessionPayload>;
    if (!payload.memberId || !payload.phone || typeof payload.exp !== "number") return null;
    if (payload.exp <= now) return null;
    return { memberId: payload.memberId, phone: payload.phone, exp: payload.exp };
  } catch {
    return null;
  }
}
