/**
 * SQLite connection via better-sqlite3, wired to Drizzle.
 *
 * WAL is enabled and foreign keys are enforced per PRD 4.3 / 20.1.
 * The domain layer talks to `db`; it never touches SQLite directly, keeping
 * a migration path to PostgreSQL open (PRD 13.4).
 */
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

const DB_PATH = process.env.DATABASE_URL ?? "./data/pos.db";

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { schema };
