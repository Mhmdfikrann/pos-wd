import { describe, expect, it } from "vitest";
import {
  createCustomerSessionToken,
  normalizeCustomerPhone,
  validateCustomerLogin,
  validateCustomerRegistration,
  verifyCustomerSessionToken,
} from "./customer-auth-core";

const SECRET = "x".repeat(32);

describe("customer auth core", () => {
  it("normalizes Indonesian phone numbers", () => {
    expect(normalizeCustomerPhone("0812-3456-7890")).toBe("6281234567890");
    expect(normalizeCustomerPhone("+62812 3456 7890")).toBe("6281234567890");
  });

  it("validates registration without touching internal users", () => {
    const result = validateCustomerRegistration({
      fullName: " Budi   Santoso ",
      phone: "081234567890",
      email: "BUDI@EXAMPLE.COM",
      password: "rahasia123",
      termsAccepted: true,
      privacyAccepted: true,
    });
    expect(result).toEqual({ ok: true, value: { fullName: "Budi Santoso", phone: "6281234567890", email: "budi@example.com", password: "rahasia123" } });
  });

  it("returns Indonesian validation errors", () => {
    expect(validateCustomerLogin({ email: "abc", password: "rahasia123" })).toEqual({ ok: false, message: "Email harus valid." });
    expect(validateCustomerLogin({ email: "budi@example.com", password: "123" })).toEqual({ ok: false, message: "Password minimal 8 karakter." });
    expect(validateCustomerRegistration({ fullName: "B", phone: "081234567890", email: "b@example.com", password: "rahasia123", termsAccepted: true, privacyAccepted: true })).toMatchObject({ ok: false, message: expect.stringContaining("Nama lengkap") });
  });

  it("signs and verifies customer session tokens", () => {
    const token = createCustomerSessionToken({ memberId: "cust_1", phone: "62812", exp: Date.now() + 1000 }, SECRET);
    expect(verifyCustomerSessionToken(token, SECRET)?.memberId).toBe("cust_1");
    expect(verifyCustomerSessionToken(`${token}x`, SECRET)).toBeNull();
    expect(verifyCustomerSessionToken(token, "y".repeat(32))).toBeNull();
  });

  it("rejects expired customer session tokens", () => {
    const token = createCustomerSessionToken({ memberId: "cust_1", phone: "62812", exp: 1000 }, SECRET);
    expect(verifyCustomerSessionToken(token, SECRET, 2000)).toBeNull();
  });
});
