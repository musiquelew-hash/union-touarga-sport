import "server-only";

import type { RowDataPacket } from "mysql2/promise";
import { getDatabasePool } from "@/lib/database";
import { replaceAllOfficialCmsData } from "@/lib/official-cms-sync";
import { ensureCmsSchema, type CmsKind } from "@/lib/relational-cms-db";

const IMPORT_KEY = "official-editorial-content-v1";
const RUNNING_TIMEOUT_SECONDS = 15 * 60;

export type InitialContentImportStatus = "not_started" | "running" | "completed" | "failed";

type ImportRow = RowDataPacket & {
  status: Exclude<InitialContentImportStatus, "not_started">;
  started_at: Date | string;
  completed_at: Date | string | null;
  is_stale: number | boolean;
};

export async function getInitialContentImportStatus(): Promise<InitialContentImportStatus> {
  await ensureCmsSchema();
  const [rows] = await getDatabasePool().query<ImportRow[]>(
    `SELECT status, started_at, completed_at,
       TIMESTAMPDIFF(SECOND, started_at, UTC_TIMESTAMP()) >= ? AS is_stale
     FROM content_imports WHERE import_key = ? LIMIT 1`,
    [RUNNING_TIMEOUT_SECONDS, IMPORT_KEY],
  );
  if (rows[0]?.status === "running" && Boolean(rows[0].is_stale)) return "failed";
  return rows[0]?.status || "not_started";
}

export async function getInitialContentImportStatusSafe(): Promise<InitialContentImportStatus> {
  try {
    return await getInitialContentImportStatus();
  } catch {
    return "not_started";
  }
}

async function claimInitialImport(adminUserId: number) {
  const connection = await getDatabasePool().getConnection();

  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<ImportRow[]>(
      `SELECT status, started_at, completed_at,
         TIMESTAMPDIFF(SECOND, started_at, UTC_TIMESTAMP()) >= ? AS is_stale
       FROM content_imports WHERE import_key = ? FOR UPDATE`,
      [RUNNING_TIMEOUT_SECONDS, IMPORT_KEY],
    );
    const current = rows[0];

    if (current?.status === "completed") {
      await connection.commit();
      return "already-completed" as const;
    }

    if (current?.status === "running" && !Boolean(current.is_stale)) {
      await connection.commit();
      return "running" as const;
    }

    await connection.execute(
      `INSERT INTO content_imports (
        import_key, status, attempt_count, triggered_by_admin_id, started_at, completed_at, last_error
       ) VALUES (?, 'running', 1, ?, UTC_TIMESTAMP(), NULL, NULL)
       ON DUPLICATE KEY UPDATE
         status = 'running', attempt_count = attempt_count + 1,
         triggered_by_admin_id = VALUES(triggered_by_admin_id),
         started_at = UTC_TIMESTAMP(), completed_at = NULL, last_error = NULL`,
      [IMPORT_KEY, adminUserId],
    );
    await connection.commit();
    return "claimed" as const;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function runInitialContentImport(adminUserId: number) {
  await ensureCmsSchema();
  const claim = await claimInitialImport(adminUserId);
  if (claim !== "claimed") return claim;

  try {
    const counts = await replaceAllOfficialCmsData();
    await getDatabasePool().execute(
      `UPDATE content_imports
       SET status = 'completed', imported_counts = ?, completed_at = UTC_TIMESTAMP(), last_error = NULL
       WHERE import_key = ?`,
      [JSON.stringify(counts satisfies Record<CmsKind, number>), IMPORT_KEY],
    );
    return "completed" as const;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    await getDatabasePool().execute(
      `UPDATE content_imports SET status = 'failed', last_error = ? WHERE import_key = ?`,
      [message.slice(0, 1000), IMPORT_KEY],
    );
    throw error;
  }
}