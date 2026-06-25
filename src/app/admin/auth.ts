import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import type { Route } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ADMIN_COOKIE = "marvel_admin_session";
const TOKEN_MESSAGE = "marvel-stat-admin-session-v1";
const MAX_AGE_SECONDS = 60 * 60 * 8;

function getAdminSecret(): string | undefined {
  return process.env.ADMIN_SECRET?.trim() || undefined;
}

function createSessionToken(secret: string): string {
  return createHmac("sha256", secret).update(TOKEN_MESSAGE).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}

export function isAdminAuthConfigured(): boolean {
  return Boolean(getAdminSecret());
}

export async function hasAdminSession(): Promise<boolean> {
  const secret = getAdminSecret();
  if (!secret) return false;

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return false;

  return safeEqual(token, createSessionToken(secret));
}

export async function requireAdminSession(): Promise<void> {
  if (!(await hasAdminSession())) {
    redirect("/admin/login" as Route);
  }
}

export async function setAdminSession(): Promise<void> {
  const secret = getAdminSecret();
  if (!secret) throw new Error("ADMIN_SECRET is not configured.");

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, createSessionToken(secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: MAX_AGE_SECONDS
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}

export function verifyAdminPassword(password: string): boolean {
  const secret = getAdminSecret();
  if (!secret) return false;
  return safeEqual(password, secret);
}
