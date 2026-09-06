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

const ADMIN_COOKIE = "uts_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;
const MINIMUM_SESSION_SECRET_LENGTH = 32;

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || "";
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
  const secret = sessionSecret();
  return isDatabaseConfigured() && secret.length >= MINIMUM_SESSION_SECRET_LENGTH;
}

export async function isAdminAuthReady() {
  if (!isAdminAuthConfigured()) return false;

  try {
    if (!(await hasAdminUsers())) await bootstrapSuperAdmin();
    return await hasAdminUsers();
  } catch {
    return false;
  }
}

export async function verifyAdminCredentials(username: string, password: string) {
  if (!isAdminAuthConfigured()) return null;
  if (!(await hasAdminUsers())) await bootstrapSuperAdmin();
  return authenticateAdmin(username, password);
}

export async function createAdminSession(admin: AdminUser) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
  const payload = Buffer.from(JSON.stringify({
    adminUserId: admin.id,
    sessionVersion: admin.sessionVersion,
    expiresAt,
  })).toString("base64url");
  const token = `${payload}.${sign(payload)}`;
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    maxAge: SESSION_DURATION_SECONDS,
    path: "/admin",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
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
      expiresAt?: number;
    };
    if (
      !session.adminUserId ||
      !session.sessionVersion ||
      !session.expiresAt ||
      session.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    const admin = await getActiveAdminUserById(session.adminUserId);
    if (!admin || admin.sessionVersion !== session.sessionVersion) return null;
    return { ...admin, expiresAt: session.expiresAt };
  } catch {
    return null;
  }
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