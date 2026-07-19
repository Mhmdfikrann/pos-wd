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
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
