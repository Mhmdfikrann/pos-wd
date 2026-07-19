import { describe, expect, it } from "vitest";
import { ROLE } from "@/lib/rbac";
import {
  loginPathWithNext,
  resolveAuthEntryPath,
  resolvePostLoginPath,
  safeInternalNextPath,
} from "@/lib/auth-redirect";

describe("auth redirect helpers", () => {
  it("sends anonymous visitors to the unified login route", () => {
    expect(resolveAuthEntryPath(null)).toBe("/login");
  });

  it("sends authenticated users to their role home", () => {
    expect(resolveAuthEntryPath(ROLE.OWNER)).toBe("/owner");
    expect(resolveAuthEntryPath(ROLE.MANAGER)).toBe("/manager");
    expect(resolveAuthEntryPath(ROLE.KASIR)).toBe("/kasir");
    expect(resolveAuthEntryPath(ROLE.KITCHEN)).toBe("/kitchen");
    expect(resolveAuthEntryPath(ROLE.INVENTORY)).toBe("/inventory");
  });

  it("accepts only local non-auth next paths", () => {
    expect(safeInternalNextPath("/kasir")).toBe("/kasir");
    expect(safeInternalNextPath("/inventory?x=1")).toBe("/inventory?x=1");
    expect(safeInternalNextPath("https://evil.test")).toBeNull();
    expect(safeInternalNextPath("//evil.test")).toBeNull();
    expect(safeInternalNextPath("owner")).toBeNull();
    expect(safeInternalNextPath("/login")).toBeNull();
    expect(safeInternalNextPath("/login/pin")).toBeNull();
  });

  it("uses an authorized safe next path after login, otherwise falls back to role home", () => {
    expect(resolvePostLoginPath(ROLE.MANAGER, "/kitchen")).toBe("/kitchen");
    expect(resolvePostLoginPath(ROLE.OWNER, "/inventory")).toBe("/inventory");
    expect(resolvePostLoginPath(ROLE.KASIR, "/kitchen")).toBe("/kasir");
    expect(resolvePostLoginPath(ROLE.KASIR, "https://evil.test")).toBe("/kasir");
    expect(resolvePostLoginPath("unknown", undefined)).toBe("/login");
  });

  it("builds login URLs without role selection", () => {
    expect(loginPathWithNext("/kasir")).toBe("/login?next=%2Fkasir");
    expect(loginPathWithNext(undefined)).toBe("/login");
    expect(loginPathWithNext("//evil.test")).toBe("/login");
  });
});
