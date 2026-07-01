import Redis from "ioredis";
import { z } from "zod";
import { HERO_TIERS, type HeroMeta } from "@/lib/officialHeroParser";
import { RIVALSMETA_TIERS, type RivalsMetaPartialError } from "@/lib/rivalsMetaParser";

export const RIVALSMETA_CACHE_KEYS = {
  current: "rivalsmeta:tier-list:current",
  lastSuccess: "rivalsmeta:tier-list:last-success",
  lastRefreshAt: "rivalsmeta:tier-list:last-refresh-at",
  refreshLock: "rivalsmeta:tier-list:refresh-lock"
} as const;

const HeroSchema = z.object({
  platform: z.literal("PC"),
  mode: z.enum(["Quick", "Competitive"]),
  tier: z.enum(HERO_TIERS),
  role: z.string(),
  hero: z.string().min(1),
  pickRate: z.number(),
  winRate: z.number(),
  updatedAt: z.string().datetime(),
  source: z.enum(["official", "rivalsmeta"]).optional(),
  sourceUrl: z.string().optional(),
  season: z.string().optional(),
  rankFilter: z.string().optional(),
  metaTier: z.enum(RIVALSMETA_TIERS).optional(),
  metaScore: z.number().optional(),
  banRate: z.number().optional(),
  matches: z.number().optional()
});
const SnapshotSchema = z.object({
  data: z.array(HeroSchema).min(1),
  source: z.enum(["rivalsmeta", "official"]),
  sourceUrl: z.string().url(),
  season: z.string(),
  availableRankFilters: z.array(z.string()),
  partialErrors: z.array(z.object({ rankFilter: z.string(), message: z.string() })),
  updatedAt: z.string().datetime(),
  expiresAt: z.number()
});

export type CachedHeroSnapshot = {
  data: HeroMeta[];
  source: "rivalsmeta" | "official";
  sourceUrl: string;
  season: string;
  availableRankFilters: string[];
  partialErrors: RivalsMetaPartialError[];
  updatedAt: Date;
  expiresAt: number;
};

type RedisGlobal = typeof globalThis & { __rivalsMetaRedis?: Redis };

function getRedis(): Redis | undefined {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return undefined;
  const globalState = globalThis as RedisGlobal;
  if (!globalState.__rivalsMetaRedis) {
    globalState.__rivalsMetaRedis = new Redis(url, {
      connectTimeout: 3_000,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: false
    });
    globalState.__rivalsMetaRedis.on("error", () => {
      // Individual operations report failures and fall back to memory cache.
    });
  }
  return globalState.__rivalsMetaRedis;
}

function serialize(snapshot: CachedHeroSnapshot): string {
  return JSON.stringify({
    ...snapshot,
    updatedAt: snapshot.updatedAt.toISOString(),
    data: snapshot.data.map((hero) => ({ ...hero, updatedAt: hero.updatedAt.toISOString() }))
  });
}

function deserialize(value: string): CachedHeroSnapshot {
  const parsed = SnapshotSchema.parse(JSON.parse(value) as unknown);
  return {
    ...parsed,
    updatedAt: new Date(parsed.updatedAt),
    data: parsed.data.map((hero) => ({ ...hero, updatedAt: new Date(hero.updatedAt) }))
  };
}

export async function readRedisSnapshot(kind: "current" | "lastSuccess"): Promise<CachedHeroSnapshot | undefined> {
  const redis = getRedis();
  if (!redis) return undefined;
  try {
    const value = await redis.get(RIVALSMETA_CACHE_KEYS[kind]);
    return value ? deserialize(value) : undefined;
  } catch (error) {
    console.warn(`[rivalsmeta-cache] Redis ${kind} read failed`, error);
    return undefined;
  }
}

export async function writeRedisSnapshot(snapshot: CachedHeroSnapshot, ttlSeconds: number): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    const value = serialize(snapshot);
    const pipeline = redis.multi();
    pipeline.set(RIVALSMETA_CACHE_KEYS.current, value, "EX", ttlSeconds);
    pipeline.set(RIVALSMETA_CACHE_KEYS.lastSuccess, value);
    pipeline.set(RIVALSMETA_CACHE_KEYS.lastRefreshAt, snapshot.updatedAt.toISOString());
    await pipeline.exec();
    return true;
  } catch (error) {
    console.warn("[rivalsmeta-cache] Redis write failed", error);
    return false;
  }
}

export async function acquireRedisRefreshLock(token: string, ttlSeconds = 600): Promise<boolean | undefined> {
  const redis = getRedis();
  if (!redis) return undefined;
  try {
    return (await redis.set(RIVALSMETA_CACHE_KEYS.refreshLock, token, "EX", ttlSeconds, "NX")) === "OK";
  } catch (error) {
    console.warn("[rivalsmeta-cache] Redis lock failed", error);
    return undefined;
  }
}

export async function releaseRedisRefreshLock(token: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      1,
      RIVALSMETA_CACHE_KEYS.refreshLock,
      token
    );
  } catch (error) {
    console.warn("[rivalsmeta-cache] Redis unlock failed", error);
  }
}
