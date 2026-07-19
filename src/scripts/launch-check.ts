import { checkLaunchHealth } from "@/lib/health";
import { env } from "@/lib/env";

const health = checkLaunchHealth(env.DATABASE_URL);

console.log(`Status: ${health.status}`);
console.log(`Checked: ${health.checkedAt}`);
console.log(`Integrity: ${health.integrity ?? "-"}`);
console.log(`Tables: ${health.tableCount}`);
if (health.missingTables.length > 0) {
  console.log(`Missing tables: ${health.missingTables.join(", ")}`);
}
if (health.error) {
  console.log(`Error: ${health.error}`);
}

process.exit(health.ok ? 0 : 1);
