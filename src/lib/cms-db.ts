import "server-only";

import mysql, { type Pool, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

export const cmsKinds = ["player", "staff", "news", "media"] as const;
export type CmsKind = (typeof cmsKinds)[number];

export type CmsRecord<T> = {
  id: number;
  kind: CmsKind;
  key: string;
  data: T;
  published: boolean;
  sortOrder: number;
  updatedAt: string;
};

export type CmsCategory<T> = {
  configured: boolean;
  records: CmsRecord<T>[];
};

type CmsRecordRow = RowDataPacket & {
  id: number;
  kind: CmsKind;
  record_key: string;
  payload: string | object;
  is_published: number | boolean;
  sort_order: number;
  updated_at: Date | string;
};

type CmsSettingRow = RowDataPacket & {
  payload: string | object;
};

type CountRow = RowDataPacket & {
  kind: CmsKind;
  total: number;
};

const globalForCms = globalThis as typeof globalThis & {
  utsCmsPool?: Pool;
  utsCmsSchema?: Promise<void>;
};

function databaseUrl() {
  return process.env.DATABASE_URL || process.env.MYSQL_URL || "";
}

export function isCmsDatabaseConfigured() {
  return Boolean(databaseUrl());
}

function getPool() {
  const url = databaseUrl();
  if (!url) {
    throw new Error("MySQL non configuré. Ajoutez DATABASE_URL ou MYSQL_URL.");
  }

  globalForCms.utsCmsPool ??= mysql.createPool(url);
  return globalForCms.utsCmsPool;
}

async function initializeSchema() {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cms_records (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      kind VARCHAR(32) NOT NULL,
      record_key VARCHAR(128) NOT NULL,
      payload JSON NOT NULL,
      is_published BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY cms_records_kind_key (kind, record_key),
      KEY cms_records_listing (kind, is_published, sort_order)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cms_settings (
      setting_key VARCHAR(100) NOT NULL,
      payload JSON NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (setting_key)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
}

export async function ensureCmsSchema() {
  if (!globalForCms.utsCmsSchema) {
    globalForCms.utsCmsSchema = initializeSchema().catch((error) => {
      globalForCms.utsCmsSchema = undefined;
      throw error;
    });
  }
  await globalForCms.utsCmsSchema;
}

function parseJson<T>(value: string | object): T {
  return (typeof value === "string" ? JSON.parse(value) : value) as T;
}

function mapRecord<T>(row: CmsRecordRow): CmsRecord<T> {
  return {
    id: Number(row.id),
    kind: row.kind,
    key: row.record_key,
    data: parseJson<T>(row.payload),
    published: Boolean(row.is_published),
    sortOrder: row.sort_order,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function getCmsCategory<T>(kind: CmsKind, includeUnpublished = false): Promise<CmsCategory<T>> {
  await ensureCmsSchema();
  const pool = getPool();
  const [countRows] = await pool.query<(RowDataPacket & { total: number })[]>(
    "SELECT COUNT(*) AS total FROM cms_records WHERE kind = ?",
    [kind],
  );
  const [rows] = await pool.query<CmsRecordRow[]>(
    `SELECT id, kind, record_key, payload, is_published, sort_order, updated_at
     FROM cms_records
     WHERE kind = ? ${includeUnpublished ? "" : "AND is_published = TRUE"}
     ORDER BY sort_order ASC, updated_at DESC`,
    [kind],
  );

  return {
    configured: Number(countRows[0]?.total || 0) > 0,
    records: rows.map(mapRecord<T>),
  };
}

export async function getCmsCategorySafe<T>(kind: CmsKind): Promise<CmsCategory<T>> {
  if (!isCmsDatabaseConfigured()) return { configured: false, records: [] };

  try {
    return await getCmsCategory<T>(kind);
  } catch (error) {
    console.error(`[CMS] Lecture impossible pour ${kind}`, error);
    return { configured: false, records: [] };
  }
}

export async function upsertCmsRecord<T>({
  kind,
  key,
  data,
  published,
  sortOrder,
}: {
  kind: CmsKind;
  key: string;
  data: T;
  published: boolean;
  sortOrder: number;
}) {
  await ensureCmsSchema();
  const pool = getPool();
  await pool.execute<ResultSetHeader>(
    `INSERT INTO cms_records (kind, record_key, payload, is_published, sort_order)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       payload = VALUES(payload),
       is_published = VALUES(is_published),
       sort_order = VALUES(sort_order)`,
    [kind, key, JSON.stringify(data), published, sortOrder],
  );
}

export async function deleteCmsRecord(kind: CmsKind, key: string) {
  await ensureCmsSchema();
  await getPool().execute("DELETE FROM cms_records WHERE kind = ? AND record_key = ?", [kind, key]);
}

export async function clearCmsCategory(kind: CmsKind) {
  await ensureCmsSchema();
  await getPool().execute("DELETE FROM cms_records WHERE kind = ?", [kind]);
}

export async function replaceCmsCategory<T>(kind: CmsKind, records: { key: string; data: T; sortOrder: number }[]) {
  await ensureCmsSchema();
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();
    await connection.execute("DELETE FROM cms_records WHERE kind = ?", [kind]);
    for (const record of records) {
      await connection.execute(
        `INSERT INTO cms_records (kind, record_key, payload, is_published, sort_order)
         VALUES (?, ?, ?, TRUE, ?)`,
        [kind, record.key, JSON.stringify(record.data), record.sortOrder],
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getCmsSetting<T>(key: string): Promise<T | null> {
  await ensureCmsSchema();
  const [rows] = await getPool().query<CmsSettingRow[]>(
    "SELECT payload FROM cms_settings WHERE setting_key = ? LIMIT 1",
    [key],
  );
  return rows[0] ? parseJson<T>(rows[0].payload) : null;
}

export async function getCmsSettingSafe<T>(key: string): Promise<T | null> {
  if (!isCmsDatabaseConfigured()) return null;

  try {
    return await getCmsSetting<T>(key);
  } catch (error) {
    console.error(`[CMS] Lecture impossible pour le réglage ${key}`, error);
    return null;
  }
}

export async function saveCmsSetting<T>(key: string, data: T) {
  await ensureCmsSchema();
  await getPool().execute<ResultSetHeader>(
    `INSERT INTO cms_settings (setting_key, payload)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE payload = VALUES(payload)`,
    [key, JSON.stringify(data)],
  );
}

export async function getCmsCounts() {
  await ensureCmsSchema();
  const [rows] = await getPool().query<CountRow[]>(
    "SELECT kind, COUNT(*) AS total FROM cms_records GROUP BY kind",
  );
  return Object.fromEntries(cmsKinds.map((kind) => [kind, Number(rows.find((row) => row.kind === kind)?.total || 0)])) as Record<CmsKind, number>;
}

export async function checkCmsConnection() {
  if (!isCmsDatabaseConfigured()) return false;

  try {
    await ensureCmsSchema();
    await getPool().query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

export async function getCmsCategoryAdminSafe<T>(kind: CmsKind): Promise<CmsCategory<T>> {
  if (!isCmsDatabaseConfigured()) return { configured: false, records: [] };

  try {
    return await getCmsCategory<T>(kind, true);
  } catch (error) {
    console.error(`[CMS] Lecture administrateur impossible pour ${kind}`, error);
    return { configured: false, records: [] };
  }
}

export async function getCmsCountsSafe() {
  if (!isCmsDatabaseConfigured()) {
    return Object.fromEntries(cmsKinds.map((kind) => [kind, 0])) as Record<CmsKind, number>;
  }

  try {
    return await getCmsCounts();
  } catch (error) {
    console.error("[CMS] Comptage impossible", error);
    return Object.fromEntries(cmsKinds.map((kind) => [kind, 0])) as Record<CmsKind, number>;
  }
}