import { defaultDatabasePath, restoreSqliteBackup } from "@/lib/backup";

const backupPath = process.argv[2];
const targetPath = process.env.RESTORE_TARGET ?? defaultDatabasePath();
const overwrite = process.env.RESTORE_OVERWRITE === "1";

if (!backupPath) {
  console.error("Usage: RESTORE_TARGET=./data/restore.db npm run db:restore -- <backup-file>");
  console.error("Set RESTORE_OVERWRITE=1 only when intentionally replacing an existing DB.");
  process.exit(1);
}

try {
  const result = restoreSqliteBackup({ backupPath, targetPath, overwrite });
  console.log(`Restored: ${result.restoredPath}`);
  console.log(`Source: ${result.sourceBackupPath}`);
  console.log(`Integrity: ${result.integrity.integrity}`);
  console.log(`Rows: ${result.integrity.rowCount}`);
} catch (err) {
  console.error("Restore failed:", err);
  process.exit(1);
}
