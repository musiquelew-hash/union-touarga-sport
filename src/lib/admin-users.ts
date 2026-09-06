import { compare, hash } from "bcryptjs";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { ensureDatabaseSchema, getDatabasePool, isDatabaseConfigured } from "@/lib/database";

export const adminRoles = ["super_admin", "admin"] as const;
export type AdminRole = (typeof adminRoles)[number];

export type AdminUser = {
  id: number;
  username: string;
  displayName: string;
  role: AdminRole;
  active: boolean;
  sessionVersion: number;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminAuditEntry = {
  id: number;
  actor: string | null;
  target: string | null;
  actionName: string;
  details: Record<string, unknown> | null;
  createdAt: string;
};

type AdminUserRow = RowDataPacket & {
  id: number;
  username: string;
  display_name: string;
  password_hash: string;
  role: AdminRole;
  is_active: number | boolean;
  session_version: number;
  last_login_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type CountRow = RowDataPacket & {
  total: number;
};

type AdminAuditRow = RowDataPacket & {
  id: number;
  actor_username: string | null;
  target_username: string | null;
  action_name: string;
  details: string | Record<string, unknown> | null;
  created_at: Date | string;
};

export class AdminAccountError extends Error {
  constructor(public readonly code: "duplicate" | "last-super-admin" | "self-change" | "not-found") {
    super(code);
  }
}

function mapAdminUser(row: AdminUserRow): AdminUser {
  return {
    id: Number(row.id),
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    active: Boolean(row.is_active),
    sessionVersion: Number(row.session_version),
    lastLoginAt: row.last_login_at ? new Date(row.last_login_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

async function writeAuditLog(
  actorAdminUserId: number | null,
  targetAdminUserId: number | null,
  actionName: string,
  details?: Record<string, unknown>,
) {
  await getDatabasePool().execute(
    `INSERT INTO admin_audit_log (actor_admin_user_id, target_admin_user_id, action_name, details)
     VALUES (?, ?, ?, ?)`,
    [actorAdminUserId, targetAdminUserId, actionName, details ? JSON.stringify(details) : null],
  );
}

export async function bootstrapSuperAdmin() {
  if (!isDatabaseConfigured()) {
    throw new Error("MYSQL_URL ou DATABASE_URL est requis pour créer le super-administrateur.");
  }

  await ensureDatabaseSchema();
  const pool = getDatabasePool();
  const [countRows] = await pool.query<CountRow[]>("SELECT COUNT(*) AS total FROM admin_users");
  if (Number(countRows[0]?.total || 0) > 0) return false;

  const username = (process.env.ADMIN_USERNAME || "admin").trim();
  const password = process.env.ADMIN_PASSWORD || "";
  const displayName = (process.env.ADMIN_DISPLAY_NAME || "Super administrateur").trim();

  if (!username || password.length < 12) {
    throw new Error("ADMIN_USERNAME et ADMIN_PASSWORD (12 caractères minimum) sont requis pour le premier compte.");
  }

  const passwordHash = await hash(password, 12);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT IGNORE INTO admin_users (username, display_name, password_hash, role, is_active)
       VALUES (?, ?, ?, 'super_admin', TRUE)`,
      [username, displayName, passwordHash],
    );
    if (result.affectedRows > 0) {
      const adminId = Number(result.insertId);
      await connection.execute(
        `INSERT INTO admin_audit_log (actor_admin_user_id, target_admin_user_id, action_name, details)
         VALUES (?, ?, 'bootstrap_super_admin', ?)`,
        [adminId, adminId, JSON.stringify({ username })],
      );
    }
    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function hasAdminUsers() {
  if (!isDatabaseConfigured()) return false;
  await ensureDatabaseSchema();
  const [rows] = await getDatabasePool().query<CountRow[]>(
    "SELECT COUNT(*) AS total FROM admin_users WHERE is_active = TRUE",
  );
  return Number(rows[0]?.total || 0) > 0;
}

export async function authenticateAdmin(username: string, password: string) {
  await ensureDatabaseSchema();
  const pool = getDatabasePool();
  const [rows] = await pool.query<AdminUserRow[]>(
    "SELECT * FROM admin_users WHERE username = ? AND is_active = TRUE LIMIT 1",
    [username.trim()],
  );
  const row = rows[0];
  if (!row || !(await compare(password, row.password_hash))) return null;

  await pool.execute("UPDATE admin_users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?", [row.id]);
  await writeAuditLog(Number(row.id), Number(row.id), "login");
  return mapAdminUser({ ...row, last_login_at: new Date() });
}

export async function getActiveAdminUserById(id: number) {
  await ensureDatabaseSchema();
  const [rows] = await getDatabasePool().query<AdminUserRow[]>(
    "SELECT * FROM admin_users WHERE id = ? AND is_active = TRUE LIMIT 1",
    [id],
  );
  return rows[0] ? mapAdminUser(rows[0]) : null;
}

export async function listAdminUsers() {
  await ensureDatabaseSchema();
  const [rows] = await getDatabasePool().query<AdminUserRow[]>(
    `SELECT * FROM admin_users
     ORDER BY role = 'super_admin' DESC, is_active DESC, username ASC`,
  );
  return rows.map(mapAdminUser);
}

export async function listAdminAuditLog(limit = 30): Promise<AdminAuditEntry[]> {
  await ensureDatabaseSchema();
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
  const [rows] = await getDatabasePool().query<AdminAuditRow[]>(
    `SELECT log.id, actor.username AS actor_username, target.username AS target_username,
            log.action_name, log.details, log.created_at
     FROM admin_audit_log AS log
     LEFT JOIN admin_users AS actor ON actor.id = log.actor_admin_user_id
     LEFT JOIN admin_users AS target ON target.id = log.target_admin_user_id
     ORDER BY log.created_at DESC, log.id DESC
     LIMIT ${safeLimit}`,
  );

  return rows.map((row) => ({
    id: Number(row.id),
    actor: row.actor_username,
    target: row.target_username,
    actionName: row.action_name,
    details: typeof row.details === "string" ? JSON.parse(row.details) as Record<string, unknown> : row.details,
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

export async function createAdminUser(
  input: { username: string; displayName: string; password: string; role: AdminRole; active: boolean },
  actorAdminUserId: number,
) {
  await ensureDatabaseSchema();
  const passwordHash = await hash(input.password, 12);

  try {
    const [result] = await getDatabasePool().execute<ResultSetHeader>(
      `INSERT INTO admin_users (
        username, display_name, password_hash, role, is_active, created_by_admin_id
       ) VALUES (?, ?, ?, ?, ?, ?)`,
      [input.username.trim(), input.displayName.trim(), passwordHash, input.role, input.active, actorAdminUserId],
    );
    const adminId = Number(result.insertId);
    await writeAuditLog(actorAdminUserId, adminId, "create_admin", {
      username: input.username.trim(),
      role: input.role,
      active: input.active,
    });
    return adminId;
  } catch (error) {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") throw new AdminAccountError("duplicate");
    throw error;
  }
}

async function activeSuperAdminCount(excludedAdminId?: number) {
  const values: number[] = [];
  let exclusion = "";
  if (excludedAdminId) {
    exclusion = "AND id <> ?";
    values.push(excludedAdminId);
  }
  const [rows] = await getDatabasePool().query<CountRow[]>(
    `SELECT COUNT(*) AS total FROM admin_users
     WHERE role = 'super_admin' AND is_active = TRUE ${exclusion}`,
    values,
  );
  return Number(rows[0]?.total || 0);
}

export async function updateAdminUser(
  id: number,
  input: { username: string; displayName: string; role: AdminRole; active: boolean; password?: string },
  actorAdminUserId: number,
) {
  await ensureDatabaseSchema();
  const pool = getDatabasePool();
  const [rows] = await pool.query<AdminUserRow[]>("SELECT * FROM admin_users WHERE id = ? LIMIT 1", [id]);
  const current = rows[0];
  if (!current) throw new AdminAccountError("not-found");
  if (id === actorAdminUserId && !input.active) throw new AdminAccountError("self-change");

  const removesActiveSuperAdmin = current.role === "super_admin" && current.is_active && (
    input.role !== "super_admin" || !input.active
  );
  if (removesActiveSuperAdmin && (await activeSuperAdminCount(id)) === 0) {
    throw new AdminAccountError("last-super-admin");
  }

  const invalidatesSessions = current.role !== input.role || Boolean(current.is_active) !== input.active || Boolean(input.password);
  const passwordHash = input.password ? await hash(input.password, 12) : null;
  try {
    await pool.execute(
      `UPDATE admin_users
       SET username = ?, display_name = ?, role = ?, is_active = ?,
           password_hash = COALESCE(?, password_hash),
           session_version = session_version + ?
       WHERE id = ?`,
      [input.username.trim(), input.displayName.trim(), input.role, input.active, passwordHash, invalidatesSessions ? 1 : 0, id],
    );
    await writeAuditLog(actorAdminUserId, id, "update_admin", {
      previousUsername: current.username,
      username: input.username.trim(),
      role: input.role,
      active: input.active,
      passwordChanged: Boolean(input.password),
    });
  } catch (error) {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") throw new AdminAccountError("duplicate");
    throw error;
  }
}

export async function changeAdminPassword(id: number, currentPassword: string, newPassword: string) {
  await ensureDatabaseSchema();
  const pool = getDatabasePool();
  const [rows] = await pool.query<AdminUserRow[]>(
    "SELECT * FROM admin_users WHERE id = ? AND is_active = TRUE LIMIT 1",
    [id],
  );
  const current = rows[0];
  if (!current || !(await compare(currentPassword, current.password_hash))) return false;

  const passwordHash = await hash(newPassword, 12);
  await pool.execute(
    "UPDATE admin_users SET password_hash = ?, session_version = session_version + 1 WHERE id = ?",
    [passwordHash, id],
  );
  await writeAuditLog(id, id, "change_own_password");
  return true;
}

export async function deleteAdminUser(id: number, actorAdminUserId: number) {
  await ensureDatabaseSchema();
  if (id === actorAdminUserId) throw new AdminAccountError("self-change");

  const pool = getDatabasePool();
  const [rows] = await pool.query<AdminUserRow[]>("SELECT * FROM admin_users WHERE id = ? LIMIT 1", [id]);
  const current = rows[0];
  if (!current) throw new AdminAccountError("not-found");
  if (current.role === "super_admin" && current.is_active && (await activeSuperAdminCount(id)) === 0) {
    throw new AdminAccountError("last-super-admin");
  }

  await writeAuditLog(actorAdminUserId, id, "delete_admin", { username: current.username });
  await pool.execute("DELETE FROM admin_users WHERE id = ?", [id]);
}
