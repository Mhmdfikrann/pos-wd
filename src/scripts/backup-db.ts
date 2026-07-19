import {
  backupSummary,
  createSqliteBackup,
  defaultBackupDir,
  defaultDatabasePath,
} from "@/lib/backup";

const sourcePath = process.env.DATABASE_URL ?? defaultDatabasePath();
const backupDir = process.env.BACKUP_DIR ?? defaultBackupDir();

createSqliteBackup({ sourcePath, backupDir })
  .then((result) => {
    console.log(backupSummary(result));
  })
  .catch((err) => {
    console.error("Backup failed:", err);
    process.exit(1);
  });
