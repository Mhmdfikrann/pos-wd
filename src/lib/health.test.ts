/**
 * Launch health/readiness tests (Phase 12).
 *
 * Verifies the production smoke-check contract without importing Next route
 * handlers: SQLite file exists, integrity_check passes, and required domain
 * tables are present.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  checkLaunchHealth,
  REQUIRED_LAUNCH_TABLES,
} from "@/lib/health";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "pos-wd-health-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function createDb(path: string, tables: readonly string[] = REQUIRED_LAUNCH_TABLES) {
  const db = new Database(path);
  for (const table of tables) {
    db.exec(`create table "${table}" (id text primary key)`);
  }
  db.close();
}

describe("checkLaunchHealth", () => {
  it("returns ok for an existing SQLite DB with required launch tables", () => {
    const path = join(dir, "pos.db");
    createDb(path);

    expect(checkLaunchHealth(path)).toMatchObject({
      ok: true,
      status: "ok",
      integrity: "ok",
      missingTables: [],
    });
  });

  it("returns unhealthy when the database file is missing", () => {
    const result = checkLaunchHealth(join(dir, "missing.db"));

    expect(result.ok).toBe(false);
    expect(result.status).toBe("missing_database");
    expect(result.error).toMatch(/tidak ditemukan/i);
  });

  it("returns unhealthy when required launch tables are missing", () => {
    const path = join(dir, "partial.db");
    createDb(path, ["users", "outlets"]);

    const result = checkLaunchHealth(path);

    expect(result.ok).toBe(false);
    expect(result.status).toBe("missing_tables");
    expect(result.missingTables).toContain("orders");
    expect(result.missingTables).toContain("payments");
  });
});
