import { verifySqliteBackup } from "@/lib/backup";

const backupPath = process.argv[2];

if (!backupPath) {
  console.error("Usage: npm run db:backup:verify -- <backup-file>");
  process.exit(1);
}

try {
  const result = verifySqliteBackup(backupPath);
  console.log(`Integrity: ${result.integrity}`);
  console.log(`Rows: ${result.rowCount}`);
  process.exit(result.ok ? 0 : 1);
} catch (err) {
  console.error("Backup verification failed:", err);
  process.exit(1);
}
