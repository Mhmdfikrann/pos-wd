/**
 * Backup / restore hardening tests (Phase 11).
 *
 * These exercise the real SQLite file path flow: create a backup with checksum,
 * verify integrity, restore to a fresh database, and refuse unsafe overwrite.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createSqliteBackup,
  restoreSqliteBackup,
  verifySqliteBackup,
} from "@/lib/backup";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "pos-wd-backup-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function seedDatabase(path: string) {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.exec(`
    create table orders (id text primary key, total integer not null);
    insert into orders (id, total) values ('order_1', 111000), ('order_2', 55000);
  `);
  db.close();
}

describe("sqlite backup and restore", () => {
  it("creates a verifiable SQLite backup with size and sha256 metadata", async () => {
    const source = join(dir, "pos.db");
    seedDatabase(source);

    const result = await createSqliteBackup({
      sourcePath: source,
      backupDir: join(dir, "backups"),
      now: new Date("2026-07-19T16:00:00.000Z"),
    });

    expect(existsSync(result.path)).toBe(true);
    expect(result.fileName).toBe("pos-wd-20260719-160000.sqlite");
    expect(result.sizeBytes).toBeGreaterThan(0);
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(verifySqliteBackup(result.path)).toMatchObject({ ok: true, rowCount: 2 });
  });

  it("restores only after validating the backup integrity", async () => {
    const source = join(dir, "pos.db");
    const restored = join(dir, "restored.db");
    seedDatabase(source);
    const backup = await createSqliteBackup({ sourcePath: source, backupDir: join(dir, "backups") });

    const result = restoreSqliteBackup({ backupPath: backup.path, targetPath: restored });

    expect(result.integrity.ok).toBe(true);
    const db = new Database(restored, { readonly: true });
    const total = db.prepare("select sum(total) as total from orders").get() as { total: number };
    db.close();
    expect(total.total).toBe(166000);
  });

  it("refuses to overwrite an existing target unless explicitly requested", async () => {
    const source = join(dir, "pos.db");
    const target = join(dir, "target.db");
    seedDatabase(source);
    seedDatabase(target);
    const backup = await createSqliteBackup({ sourcePath: source, backupDir: join(dir, "backups") });

    expect(() => restoreSqliteBackup({ backupPath: backup.path, targetPath: target })).toThrow(/overwrite/i);
  });
});
