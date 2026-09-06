import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ADMIN_COOKIE = "uts_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;
const MINIMUM_PASSWORD_LENGTH = 12;
const MINIMUM_SESSION_SECRET_LENGTH = 32;

function configuredUsername() {
  return process.env.ADMIN_USERNAME || "admin";
}

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
  const password = process.env.ADMIN_PASSWORD || "";
  const secret = sessionSecret();
  return (
    password.length >= MINIMUM_PASSWORD_LENGTH &&
    secret.length >= MINIMUM_SESSION_SECRET_LENGTH &&
    secret !== password
  );
}

export function verifyAdminCredentials(username: string, password: string) {
  const expectedPassword = process.env.ADMIN_PASSWORD || "";
  return (
    isAdminAuthConfigured() &&
    safeEqual(username, configuredUsername()) &&
    safeEqual(password, expectedPassword)
  );
}

export async function createAdminSession(username: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
  const payload = Buffer.from(JSON.stringify({ username, expiresAt })).toString("base64url");
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
      username?: string;
      expiresAt?: number;
    };
    if (
      session.username !== configuredUsername() ||
      !session.expiresAt ||
      session.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return { username: session.username, expiresAt: session.expiresAt };
  } catch {
    return null;
  }
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}