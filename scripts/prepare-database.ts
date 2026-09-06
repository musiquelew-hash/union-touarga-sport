import { loadEnvConfig } from "@next/env";
import { bootstrapSuperAdmin } from "../src/lib/admin-users";
import { closeDatabasePool } from "../src/lib/database";
import { ensureCmsSchema } from "../src/lib/relational-cms-db";

async function main() {
  loadEnvConfig(process.cwd());

  try {
    await ensureCmsSchema();
    await bootstrapSuperAdmin();

    console.log("Base MySQL prête.");
    console.log("Super-admin initial : disponible.");
    console.log("Contenus éditoriaux : gérés depuis le dashboard, sans import au déploiement.");
  } finally {
    await closeDatabasePool();
  }
}

main().catch((error) => {
  console.error("Préparation MySQL impossible.", error);
  process.exitCode = 1;
});
