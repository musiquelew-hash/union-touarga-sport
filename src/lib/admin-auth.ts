import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  authenticateAdmin,
  bootstrapSuperAdmin,
  getActiveAdminUserById,
  hasAdminUsers,
  type AdminUser,
} from "@/lib/admin-users";
import { isDatabaseConfigured } from "@/lib/database";
import { getSessionSigningKey } from "@/lib/session-security";

const ADMIN_COOKIE = "uts_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;
const SESSION_REFRESH_THRESHOLD_SECONDS = 60 * 60 * 2;
const SESSION_ABSOLUTE_DURATION_SECONDS = 60 * 60 * 24 * 7;
function sessionSecret() {
  return getSessionSigningKey("admin");
}

function safeEqual(first: string, second: string) {
  const left = Buffer.from(first);
  const right = Buffer.from(second);
  return left.length === right.length && timingSafeEqual(left, right);
}

function sign(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function isAdminAuthConfigured() {
  return isDatabaseConfigured() && Boolean(sessionSecret());
}

export async function verifyAdminCredentials(username: string, password: string) {
  if (!isAdminAuthConfigured()) return null;
  if (!(await hasAdminUsers())) await bootstrapSuperAdmin();
  return authenticateAdmin(username, password);
}

async function setAdminSession(admin: AdminUser, issuedAt: number, absoluteExpiresAt: number) {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = Math.min(now + SESSION_DURATION_SECONDS, absoluteExpiresAt);
  const payload = Buffer.from(JSON.stringify({
    adminUserId: admin.id,
    sessionVersion: admin.sessionVersion,
    issuedAt,
    expiresAt,
    absoluteExpiresAt,
  })).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    maxAge: Math.max(0, expiresAt - now),
    path: "/admin",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function createAdminSession(admin: AdminUser) {
  const issuedAt = Math.floor(Date.now() / 1000);
  await setAdminSession(admin, issuedAt, issuedAt + SESSION_ABSOLUTE_DURATION_SECONDS);
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/admin",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function getAdminSession() {
  if (!isAdminAuthConfigured()) return null;
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      adminUserId?: number;
      sessionVersion?: number;
      issuedAt?: number;
      expiresAt?: number;
      absoluteExpiresAt?: number;
    };
    const now = Math.floor(Date.now() / 1000);
    if (!session.adminUserId || !session.sessionVersion || !session.expiresAt || session.expiresAt <= now) return null;
    const issuedAt = session.issuedAt || session.expiresAt - SESSION_DURATION_SECONDS;
    const absoluteExpiresAt = session.absoluteExpiresAt || issuedAt + SESSION_ABSOLUTE_DURATION_SECONDS;
    if (absoluteExpiresAt <= now) return null;
    const admin = await getActiveAdminUserById(session.adminUserId);
    if (!admin || admin.sessionVersion !== session.sessionVersion) return null;
    return { ...admin, issuedAt, expiresAt: session.expiresAt, absoluteExpiresAt };
  } catch {
    return null;
  }
}

export async function refreshAdminSession() {
  const session = await getAdminSession();
  if (!session) return false;
  if (session.expiresAt - Math.floor(Date.now() / 1000) <= SESSION_REFRESH_THRESHOLD_SECONDS) {
    await setAdminSession(session, session.issuedAt, session.absoluteExpiresAt);
  }
  return true;
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function requireSuperAdmin() {
  const session = await requireAdmin();
  if (session.role !== "super_admin") redirect("/admin?error=forbidden");
  return session;
}
