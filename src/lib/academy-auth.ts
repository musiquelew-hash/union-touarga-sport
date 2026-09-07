import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { RowDataPacket } from "mysql2/promise";
import { ensureDatabaseSchema, getDatabasePool, isDatabaseConfigured } from "@/lib/database";

const ACADEMY_COOKIE = "uts_academy_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12;

export type AcademyAccountRole = "coach" | "guardian";
export type AcademyAccount = {
  id: number;
  email: string;
  displayName: string;
  phone: string;
  role: AcademyAccountRole;
  sessionVersion: number;
};

type AccountRow = RowDataPacket & {
  account_id: number;
  email: string;
  display_name: string;
  phone: string;
  role: AcademyAccountRole;
  password_hash: string;
  session_version: number;
};

function secret() {
  return process.env.ADMIN_SESSION_SECRET || "";
}

function sign(payload: string) {
  return createHmac("sha256", `${secret()}:academy`).update(payload).digest("base64url");
}

function safeEqual(leftValue: string, rightValue: string) {
  const left = Buffer.from(leftValue);
  const right = Buffer.from(rightValue);
  return left.length === right.length && timingSafeEqual(left, right);
}

function mapAccount(row: AccountRow): AcademyAccount {
  return { id: Number(row.account_id), email: row.email, displayName: row.display_name,
    phone: row.phone, role: row.role, sessionVersion: Number(row.session_version) };
}

async function findActiveAccount(id: number) {
  await ensureDatabaseSchema();
  const [rows] = await getDatabasePool().query<AccountRow[]>(
    "SELECT * FROM academy_accounts WHERE account_id = ? AND is_active = TRUE LIMIT 1", [id],
  );
  return rows[0] ? mapAccount(rows[0]) : null;
}

export async function authenticateAcademyAccount(email: string, password: string) {
  if (!isDatabaseConfigured() || secret().length < 32) return null;
  await ensureDatabaseSchema();
  const [rows] = await getDatabasePool().query<AccountRow[]>(
    "SELECT * FROM academy_accounts WHERE email = ? AND is_active = TRUE LIMIT 1", [email.trim().toLowerCase()],
  );
  const row = rows[0];
  if (!row || !(await compare(password, row.password_hash))) return null;
  await getDatabasePool().execute("UPDATE academy_accounts SET last_login_at = UTC_TIMESTAMP() WHERE account_id = ?", [row.account_id]);
  return mapAccount(row);
}

export async function createAcademySession(account: AcademyAccount) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
  const payload = Buffer.from(JSON.stringify({ accountId: account.id, sessionVersion: account.sessionVersion, expiresAt })).toString("base64url");
  (await cookies()).set(ACADEMY_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    maxAge: SESSION_DURATION_SECONDS,
    path: "/academie",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearAcademySession() {
  (await cookies()).set(ACADEMY_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/academie", sameSite: "strict", secure: process.env.NODE_ENV === "production" });
}

export async function getAcademySession() {
  if (!isDatabaseConfigured() || secret().length < 32) return null;
  const token = (await cookies()).get(ACADEMY_COOKIE)?.value;
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { accountId?: number; sessionVersion?: number; expiresAt?: number };
    if (!data.accountId || !data.sessionVersion || !data.expiresAt || data.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    const account = await findActiveAccount(data.accountId);
    return account?.sessionVersion === data.sessionVersion ? account : null;
  } catch {
    return null;
  }
}

export async function requireAcademyAccount(role?: AcademyAccountRole) {
  const account = await getAcademySession();
  if (!account) redirect("/academie/connexion");
  if (role && account.role !== role) redirect("/academie/espace");
  return account;
}