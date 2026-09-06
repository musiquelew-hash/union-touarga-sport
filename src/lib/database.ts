import { readFile } from "node:fs/promises";
import path from "node:path";
import mysql, { type Pool } from "mysql2/promise";

const globalForDatabase = globalThis as typeof globalThis & {
  utsDatabasePool?: Pool;
  utsDatabaseSchema?: Promise<void>;
};

export function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.MYSQL_URL || "";
}

export function isDatabaseConfigured() {
  return Boolean(getDatabaseUrl());
}

export function getDatabasePool() {
  const url = getDatabaseUrl();

  if (!url) {
    throw new Error("MySQL non configuré. Ajoutez DATABASE_URL ou MYSQL_URL.");
  }

  globalForDatabase.utsDatabasePool ??= mysql.createPool(url);
  return globalForDatabase.utsDatabasePool;
}

export async function closeDatabasePool() {
  const pool = globalForDatabase.utsDatabasePool;
  globalForDatabase.utsDatabasePool = undefined;
  globalForDatabase.utsDatabaseSchema = undefined;

  await pool?.end();
}

async function applyDatabaseSchema() {
  const schema = await readFile(path.join(process.cwd(), "db", "schema.sql"), "utf8");
  const connection = await mysql.createConnection({
    uri: getDatabaseUrl(),
    multipleStatements: true,
  });

  try {
    await connection.query(schema);
  } finally {
    await connection.end();
  }
}

export async function ensureDatabaseSchema() {
  if (!globalForDatabase.utsDatabaseSchema) {
    globalForDatabase.utsDatabaseSchema = applyDatabaseSchema().catch((error) => {
      globalForDatabase.utsDatabaseSchema = undefined;
      throw error;
    });
  }

  await globalForDatabase.utsDatabaseSchema;
}