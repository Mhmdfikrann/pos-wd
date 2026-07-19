/**
 * Tests for the fail-fast env loader (Phase 1 AC: "missing required env var
 * fails startup with a clear message"). Uses the exported `loadEnv` so we
 * validate arbitrary sources without mutating the real process.env.
 */
import { describe, it, expect } from "vitest";
import { loadEnv } from "./env";

const SECRET = "x".repeat(32);
const GOOD = {
  DATABASE_URL: "./data/pos.db",
  BETTER_AUTH_SECRET: SECRET,
  BETTER_AUTH_URL: "http://localhost:3000",
};

describe("loadEnv", () => {
  it("returns the validated values for a good config", () => {
    const env = loadEnv(GOOD);
    expect(env.DATABASE_URL).toBe("./data/pos.db");
    expect(env.BETTER_AUTH_SECRET).toBe(SECRET);
    expect(env.BETTER_AUTH_URL).toBe("http://localhost:3000");
  });

  it("applies defaults for DATABASE_URL and BETTER_AUTH_URL when unset", () => {
    const env = loadEnv({ BETTER_AUTH_SECRET: SECRET });
    expect(env.DATABASE_URL).toBe("./data/pos.db");
    expect(env.BETTER_AUTH_URL).toBe("http://localhost:3000");
  });

  it("throws naming the missing key when a no-default var is absent", () => {
    expect(() => loadEnv({})).toThrow(/BETTER_AUTH_SECRET/);
  });

  it("rejects a too-short secret with a clear message", () => {
    expect(() => loadEnv({ ...GOOD, BETTER_AUTH_SECRET: "short" })).toThrow(
      /BETTER_AUTH_SECRET[\s\S]*32/,
    );
  });

  it("rejects a non-absolute BETTER_AUTH_URL", () => {
    expect(() => loadEnv({ ...GOOD, BETTER_AUTH_URL: "localhost:3000" })).toThrow(
      /BETTER_AUTH_URL/,
    );
  });

  it("treats whitespace-only values as empty", () => {
    expect(() => loadEnv({ ...GOOD, BETTER_AUTH_SECRET: "   " })).toThrow(
      /BETTER_AUTH_SECRET/,
    );
  });

  it("collects multiple errors in one throw", () => {
    try {
      loadEnv({ BETTER_AUTH_SECRET: "short", BETTER_AUTH_URL: "nope" });
      expect.unreachable("should have thrown");
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toMatch(/BETTER_AUTH_SECRET/);
      expect(msg).toMatch(/BETTER_AUTH_URL/);
    }
  });
});
