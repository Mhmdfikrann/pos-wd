import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Vitest config for Wanna Dimsum POS.
 *
 * Node environment: current tests cover pure helpers (money/format) and the
 * server-side env loader — no DOM needed. The `@/` alias mirrors tsconfig so
 * tests import the same paths as app code. Alias is resolved by hand to avoid
 * pulling in an extra plugin dependency for three test files.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      BETTER_AUTH_SECRET: "012345678901234567890123456789012345",
      BETTER_AUTH_URL: "http://localhost:3000",
      DATABASE_URL: "./data/pos.db",
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/lib/server-only-mock.ts", import.meta.url)),
    },
  },
});
