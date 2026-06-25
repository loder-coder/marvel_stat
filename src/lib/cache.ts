import Redis from "ioredis";
import type { Cached } from "@/lib/types";

const memory = new Map<string, { value: string; expiresAt: number }>();
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: true }) : null;

async function rawGet(key: string) {
  if (redis) { try { return await redis.get(key); } catch { /* use process cache during local development */ } }
  const entry = memory.get(key);
  if (!entry || entry.expiresAt < Date.now()) { memory.delete(key); return null; }
  return entry.value;
}
async function rawSet(key: string, value: string, seconds: number) {
  if (redis) { try { await redis.set(key, value, "EX", seconds); return; } catch { /* fallback */ } }
  memory.set(key, { value, expiresAt: Date.now() + seconds * 1000 });
}
async function rawDel(key: string) { if (redis) { try { await redis.del(key); return; } catch {} } memory.delete(key); }

export async function getCached<T>(key: string): Promise<Cached<T> | null> {
  const raw = await rawGet(key); return raw ? JSON.parse(raw) as Cached<T> : null;
}
export async function setCached<T>(key: string, value: T, freshSeconds: number, staleSeconds: number) {
  const now = Date.now(); const cached: Cached<T> = { value, fetchedAt: new Date(now).toISOString(), freshUntil: new Date(now + freshSeconds * 1000).toISOString(), staleUntil: new Date(now + staleSeconds * 1000).toISOString() };
  await rawSet(key, JSON.stringify(cached), staleSeconds); return cached;
}
export function cacheState<T>(entry: Cached<T>) { return Date.now() <= Date.parse(entry.freshUntil) ? "fresh" : "stale"; }
export async function acquireLock(key: string, seconds = 15) {
  const token = crypto.randomUUID();
  if (redis) { try { return (await redis.set(key, token, "EX", seconds, "NX")) === "OK" ? token : null; } catch {} }
  if (await rawGet(key)) return null; await rawSet(key, token, seconds); return token;
}
export async function releaseLock(key: string, token: string) { if ((await rawGet(key)) === token) await rawDel(key); }
export async function increment(key: string, seconds: number) {
  if (redis) { try { const count = await redis.incr(key); if (count === 1) await redis.expire(key, seconds); return count; } catch {} }
  const existing = Number(await rawGet(key) ?? 0) + 1; await rawSet(key, String(existing), seconds); return existing;
}
export async function getNumber(key: string) { return Number(await rawGet(key) ?? 0); }
