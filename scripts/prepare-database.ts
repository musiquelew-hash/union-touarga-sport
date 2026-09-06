import { loadEnvConfig } from "@next/env";
import { bootstrapSuperAdmin } from "../src/lib/admin-users";
import { closeDatabasePool } from "../src/lib/database";
import { OfficialCmsSyncError, syncAllOfficialCmsData } from "../src/lib/official-cms-sync";
import { cmsKinds, ensureCmsSchema, getCmsCounts } from "../src/lib/relational-cms-db";

async function main() {
  loadEnvConfig(process.cwd());

  try {
    await ensureCmsSchema();
    const superAdminCreated = await bootstrapSuperAdmin();
    const existingCounts = await getCmsCounts();
    let synchronized = Object.fromEntries(cmsKinds.map((kind) => [kind, 0])) as Record<(typeof cmsKinds)[number], number>;

    try {
      synchronized = await syncAllOfficialCmsData();
    } catch (error) {
      const databaseAlreadyPopulated = cmsKinds.every((kind) => existingCounts[kind] > 0);
      if (!(error instanceof OfficialCmsSyncError) || !databaseAlreadyPopulated) throw error;

      console.warn(
        `Source officielle temporairement indisponible (${error.failedKinds.join(", ")}). Données MySQL existantes conservées.`,
      );
    }

    const totals = await getCmsCounts();

    console.log("Base MySQL prête.");
    console.log(`Super-admin initial : ${superAdminCreated ? "créé" : "déjà présent"}`);
    for (const [kind, fetched] of Object.entries(synchronized)) {
      console.log(`${kind}: ${fetched} synchronisés, ${totals[kind as keyof typeof totals]} en base`);
    }
  } finally {
    await closeDatabasePool();
  }
}

main().catch((error) => {
  console.error("Préparation MySQL impossible.", error);
  process.exitCode = 1;
});
