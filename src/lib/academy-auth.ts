import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { RowDataPacket } from "mysql2/promise";
import { ensureDatabaseSchema, getDatabasePool, isDatabaseConfigured } from "@/lib/database";
import { getSessionSigningKey } from "@/lib/session-security";

const ACADEMY_COOKIE = "uts_academy_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12;
const SESSION_REFRESH_THRESHOLD_SECONDS = 60 * 60 * 3;
const SESSION_ABSOLUTE_DURATION_SECONDS = 60 * 60 * 24 * 14;

export type AcademyAccountRole = "coach" | "guardian" | "player";
export type AcademyAccount = {
  id: number;
  username: string;
  email: string;
  displayName: string;
  phone: string;
  role: AcademyAccountRole;
  sessionVersion: number;
};

type AccountRow = RowDataPacket & {
  account_id: number;
  username: string;
  email: string;
  display_name: string;
  phone: string;
  role: AcademyAccountRole;
  password_hash: string;
  session_version: number;
};

function secret() {
  return getSessionSigningKey("academy");
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
  return { id: Number(row.account_id), username: row.username, email: row.email, displayName: row.display_name,
    phone: row.phone, role: row.role, sessionVersion: Number(row.session_version) };
}

async function findActiveAccount(id: number) {
  await ensureDatabaseSchema();
  const [rows] = await getDatabasePool().query<AccountRow[]>(
    "SELECT * FROM academy_accounts WHERE account_id = ? AND is_active = TRUE LIMIT 1", [id],
  );
  return rows[0] ? mapAccount(rows[0]) : null;
}

export async function authenticateAcademyAccount(identifier: string, password: string) {
  if (!isDatabaseConfigured() || !secret()) return null;
  await ensureDatabaseSchema();
  const [rows] = await getDatabasePool().query<AccountRow[]>(
    "SELECT * FROM academy_accounts WHERE (email = ? OR username = ?) AND is_active = TRUE LIMIT 1",
    [identifier.trim().toLowerCase(), identifier.trim().toLowerCase()],
  );
  const row = rows[0];
  if (!row || !(await compare(password, row.password_hash))) return null;
  await getDatabasePool().execute("UPDATE academy_accounts SET last_login_at = UTC_TIMESTAMP() WHERE account_id = ?", [row.account_id]);
  return mapAccount(row);
}

async function setAcademySession(account: AcademyAccount, issuedAt: number, absoluteExpiresAt: number) {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = Math.min(now + SESSION_DURATION_SECONDS, absoluteExpiresAt);
  const payload = Buffer.from(JSON.stringify({ accountId: account.id, sessionVersion: account.sessionVersion, issuedAt, expiresAt, absoluteExpiresAt })).toString("base64url");
  (await cookies()).set(ACADEMY_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    maxAge: Math.max(0, expiresAt - now),
    path: "/academie",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function createAcademySession(account: AcademyAccount) {
  const issuedAt = Math.floor(Date.now() / 1000);
  await setAcademySession(account, issuedAt, issuedAt + SESSION_ABSOLUTE_DURATION_SECONDS);
}

export async function clearAcademySession() {
  (await cookies()).set(ACADEMY_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/academie", sameSite: "strict", secure: process.env.NODE_ENV === "production" });
}

export async function getAcademySession() {
  if (!isDatabaseConfigured() || !secret()) return null;
  const token = (await cookies()).get(ACADEMY_COOKIE)?.value;
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      accountId?: number;
      sessionVersion?: number;
      issuedAt?: number;
      expiresAt?: number;
      absoluteExpiresAt?: number;
    };
    const now = Math.floor(Date.now() / 1000);
    if (!data.accountId || !data.sessionVersion || !data.expiresAt || data.expiresAt <= now) return null;
    const issuedAt = data.issuedAt || data.expiresAt - SESSION_DURATION_SECONDS;
    const absoluteExpiresAt = data.absoluteExpiresAt || issuedAt + SESSION_ABSOLUTE_DURATION_SECONDS;
    if (absoluteExpiresAt <= now) return null;
    const account = await findActiveAccount(data.accountId);
    if (!account || account.sessionVersion !== data.sessionVersion) return null;
    return { ...account, issuedAt, expiresAt: data.expiresAt, absoluteExpiresAt };
  } catch {
    return null;
  }
}

export async function refreshAcademySession() {
  const session = await getAcademySession();
  if (!session) return false;
  if (session.expiresAt - Math.floor(Date.now() / 1000) <= SESSION_REFRESH_THRESHOLD_SECONDS) {
    await setAcademySession(session, session.issuedAt, session.absoluteExpiresAt);
  }
  return true;
}

export async function requireAcademyAccount(role?: AcademyAccountRole) {
  const account = await getAcademySession();
  if (!account) redirect("/academie/connexion");
  if (role && account.role !== role) redirect("/academie/espace");
  return account;
}
