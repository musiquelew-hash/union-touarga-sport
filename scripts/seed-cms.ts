import { loadEnvConfig } from "@next/env";
import mysql from "mysql2/promise";
import { getOfficialCmsSeedData } from "../src/lib/official-cms-source";
import { defaultSiteContent } from "../src/lib/site-content-defaults";

type SeedRecord = {
  key: string;
  data: unknown;
  sortOrder: number;
};

async function main() {
  loadEnvConfig(process.cwd());
  const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

  if (!databaseUrl) {
    throw new Error("MYSQL_URL ou DATABASE_URL est requis pour alimenter le CMS.");
  }

  const data = await getOfficialCmsSeedData();
  const collections: [string, SeedRecord[]][] = [
    ["player", data.players.map((item, index) => ({ key: String(item.id), data: item, sortOrder: index }))],
    ["staff", data.staff.map((item, index) => ({ key: String(item.id), data: item, sortOrder: index }))],
    ["news", data.news.map((item, index) => ({ key: String(item.id), data: item, sortOrder: index }))],
    ["media", data.media.map((item, index) => ({ key: item.id, data: item, sortOrder: index }))],
  ];
  const pool = mysql.createPool(databaseUrl);

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

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    for (const [kind, records] of collections) {
      await connection.execute("DELETE FROM cms_records WHERE kind = ?", [kind]);
      for (const record of records) {
        await connection.execute(
          `INSERT INTO cms_records (kind, record_key, payload, is_published, sort_order)
           VALUES (?, ?, ?, TRUE, ?)`,
          [kind, record.key, JSON.stringify(record.data), record.sortOrder],
        );
      }
    }
    await connection.execute(
      "INSERT IGNORE INTO cms_settings (setting_key, payload) VALUES (?, ?)",
      ["site-content", JSON.stringify(defaultSiteContent)],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }

  console.log(
    `${collections.map(([kind, records]) => `${kind}: ${records.length}`).join("\n")}\nsite-content: initialized`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
