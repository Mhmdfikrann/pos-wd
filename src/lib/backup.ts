/**
 * SQLite backup / restore helpers (Phase 11).
 *
 * Designed for the ops scripts and tests. The app DB is a single SQLite file;
 * backup uses SQLite's online backup API so it can run while the source DB is
 * open, then records checksum metadata for restore drills.
 */
import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

export interface CreateSqliteBackupInput {
  sourcePath: string;
  backupDir: string;
  now?: Date;
}

export interface SqliteBackupResult {
  path: string;
  fileName: string;
  sizeBytes: number;
  sha256: string;
  createdAt: string;
}

export interface VerifySqliteBackupResult {
  ok: boolean;
  rowCount: number;
  integrity: string;
}

export interface RestoreSqliteBackupInput {
  backupPath: string;
  targetPath: string;
  overwrite?: boolean;
}

export interface RestoreSqliteBackupResult {
  restoredPath: string;
  sourceBackupPath: string;
  integrity: VerifySqliteBackupResult;
}

export async function createSqliteBackup(input: CreateSqliteBackupInput): Promise<SqliteBackupResult> {
  const sourcePath = resolve(input.sourcePath);
  const backupDir = resolve(input.backupDir);
  if (!existsSync(sourcePath)) {
    throw new Error(`Database source tidak ditemukan: ${sourcePath}`);
  }

  mkdirSync(backupDir, { recursive: true });
  const createdAt = input.now ?? new Date();
  const fileName = `pos-wd-${timestampForFile(createdAt)}.sqlite`;
  const backupPath = join(backupDir, fileName);
  if (existsSync(backupPath)) {
    throw new Error(`Backup target sudah ada: ${backupPath}`);
  }

  const source = new Database(sourcePath, { readonly: true });
  try {
    await source.backup(backupPath);
  } finally {
    source.close();
  }

  const integrity = verifySqliteBackup(backupPath);
  if (!integrity.ok) {
    rmSync(backupPath, { force: true });
    throw new Error(`Backup gagal integrity_check: ${integrity.integrity}`);
  }

  return {
    path: backupPath,
    fileName,
    sizeBytes: statSync(backupPath).size,
    sha256: await sha256File(backupPath),
    createdAt: createdAt.toISOString(),
  };
}

export function verifySqliteBackup(backupPath: string): VerifySqliteBackupResult {
  const resolved = resolve(backupPath);
  if (!existsSync(resolved)) {
    throw new Error(`Backup tidak ditemukan: ${resolved}`);
  }

  const db = new Database(resolved, { readonly: true, fileMustExist: true });
  try {
    const integrityRow = db.pragma("integrity_check", { simple: true }) as string;
    const tables = db
      .prepare("select name from sqlite_master where type = 'table' and name not like 'sqlite_%'")
      .all() as Array<{ name: string }>;
    return {
      ok: integrityRow === "ok",
      rowCount: tables.reduce((total, table) => total + countRows(db, table.name), 0),
      integrity: integrityRow,
    };
  } finally {
    db.close();
  }
}

export function restoreSqliteBackup(input: RestoreSqliteBackupInput): RestoreSqliteBackupResult {
  const backupPath = resolve(input.backupPath);
  const targetPath = resolve(input.targetPath);
  if (!existsSync(backupPath)) {
    throw new Error(`Backup tidak ditemukan: ${backupPath}`);
  }
  if (existsSync(targetPath) && !input.overwrite) {
    throw new Error(`Target restore sudah ada; set overwrite=true untuk menimpa: ${targetPath}`);
  }

  const integrity = verifySqliteBackup(backupPath);
  if (!integrity.ok) {
    throw new Error(`Restore dibatalkan: backup tidak lolos integrity_check (${integrity.integrity}).`);
  }

  mkdirSync(dirname(targetPath), { recursive: true });
  const tmpPath = `${targetPath}.restore-${process.pid}-${Date.now()}.tmp`;
  copyFileSync(backupPath, tmpPath);
  try {
    if (existsSync(targetPath)) rmSync(targetPath, { force: true });
    renameSync(tmpPath, targetPath);
  } catch (err) {
    rmSync(tmpPath, { force: true });
    throw err;
  }

  return {
    restoredPath: targetPath,
    sourceBackupPath: backupPath,
    integrity,
  };
}

async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256");
  hash.update(await readFile(path));
  return hash.digest("hex");
}

function timestampForFile(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "").replace("T", "-");
}

function countRows(db: Database.Database, tableName: string): number {
  const quoted = `"${tableName.replace(/"/g, '""')}"`;
  const row = db.prepare(`select count(*) as count from ${quoted}`).get() as { count: number };
  return row.count;
}

export function defaultBackupDir(): string {
  return resolve(process.env.BACKUP_DIR ?? join(process.cwd(), "backups"));
}

export function defaultDatabasePath(): string {
  return resolve(process.env.DATABASE_URL ?? "./data/pos.db");
}

export function backupSummary(result: SqliteBackupResult): string {
  return [
    `Backup: ${basename(result.path)}`,
    `Path: ${result.path}`,
    `Size: ${result.sizeBytes} bytes`,
    `SHA256: ${result.sha256}`,
    `Created: ${result.createdAt}`,
  ].join("\n");
}
