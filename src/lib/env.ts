/**
 * Typed, fail-fast environment loader (PRD §13.3 — secrets in env, never repo).
 *
 * Every required variable is validated once, on first access, with a clear
 * message naming the offending key. Missing/invalid config throws at that point
 * rather than surfacing as a confusing runtime error deep in better-auth or the
 * DB driver.
 *
 * Dependency-free on purpose: the only schema lib in the tree (zod) is a
 * transitive dep of better-auth, not a declared dependency — validating three
 * strings by hand keeps this loader honest about what the project actually owns.
 *
 * Usage: `import { env } from "@/lib/env"` then `env.DATABASE_URL`. Works in the
 * Next server runtime and in Node scripts (seed, drizzle) alike. Do NOT import
 * from client components — this reads server-only secrets.
 */

type RawEnv = Record<string, string | undefined>;

interface Rule {
  /** Fallback used only when the var is unset (dev convenience). */
  default?: string;
  /** Extra validation beyond "non-empty"; return an error string or null. */
  validate?: (value: string) => string | null;
}

const RULES = {
  /** SQLite path for better-sqlite3. Defaults for local dev. */
  DATABASE_URL: { default: "./data/pos.db" },
  /** better-auth signing secret. Must be long enough to be safe (§13.3). */
  BETTER_AUTH_SECRET: {
    validate: (v) =>
      v.length >= 32
        ? null
        : "harus minimal 32 karakter (buat dengan: node -e \"console.log(require('crypto').randomBytes(32).toString('base64url'))\")",
  },
  /** Public base URL better-auth issues callbacks/cookies against. */
  BETTER_AUTH_URL: {
    default: "http://localhost:3000",
    validate: (v) =>
      /^https?:\/\//.test(v) ? null : "harus berupa URL absolut (http:// atau https://)",
  },
} satisfies Record<string, Rule>;

type EnvKey = keyof typeof RULES;

function loadEnv(source: RawEnv): Record<EnvKey, string> {
  const errors: string[] = [];
  const out = {} as Record<EnvKey, string>;

  for (const key of Object.keys(RULES) as EnvKey[]) {
    const rule: Rule = RULES[key];
    const raw = source[key]?.trim();
    const value = raw && raw.length > 0 ? raw : rule.default;

    if (value === undefined || value.length === 0) {
      errors.push(`  - ${key}: wajib diisi (tidak ada nilai dan tidak ada default)`);
      continue;
    }

    const problem = rule.validate?.(value);
    if (problem) {
      errors.push(`  - ${key}: ${problem}`);
      continue;
    }

    out[key] = value;
  }

  if (errors.length > 0) {
    throw new Error(
      `Konfigurasi environment tidak valid. Perbaiki .env (lihat .env.example):\n${errors.join(
        "\n",
      )}`,
    );
  }

  return out;
}

/**
 * Validated env, evaluated once on first property access (not at import). This
 * keeps fail-fast behavior — the first code path that actually reads a var in a
 * misconfigured environment throws with a listing of every bad key — while
 * letting tooling that only imports the module (tests, type-checkers) load it
 * without a live `.env`. The result is cached after the first access.
 */
let cached: Record<EnvKey, string> | null = null;
function resolved(): Record<EnvKey, string> {
  return (cached ??= loadEnv(process.env));
}

export const env = new Proxy({} as Record<EnvKey, string>, {
  get: (_t, key: string) => resolved()[key as EnvKey],
  has: (_t, key: string) => key in resolved(),
  ownKeys: () => Reflect.ownKeys(resolved()),
  getOwnPropertyDescriptor: (_t, key: string) => ({
    enumerable: true,
    configurable: true,
    value: resolved()[key as EnvKey],
  }),
});

export type Env = Record<EnvKey, string>;

/** Exposed for tests: validate an arbitrary source without touching process.env. */
export { loadEnv };
