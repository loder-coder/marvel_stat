import { Redis as UpstashRedis } from "@upstash/redis";
import IORedis from "ioredis";
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
  ,
  charactersSourceUrl: z.string().optional(),
  charactersScope: z.string().optional()
});
const SnapshotSchema = z.object({
  data: z.array(HeroSchema).min(1),
  source: z.enum(["rivalsmeta", "official"]),
  sourceUrl: z.string().url(),
  season: z.string(),
  availableRankFilters: z.array(z.string()),
  partialErrors: z.array(z.object({ rankFilter: z.string(), message: z.string() })),
  charactersSourceUrl: z.string().optional(),
  charactersScope: z.string().optional(),
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
  charactersSourceUrl?: string;
  charactersScope?: string;
  updatedAt: Date;
  expiresAt: number;
};

type RedisProvider =
  | { kind: "upstash"; client: UpstashRedis }
  | { kind: "ioredis"; client: IORedis };
type RedisGlobal = typeof globalThis & {
  __rivalsMetaUpstash?: UpstashRedis;
  __rivalsMetaIORedis?: IORedis;
  __rivalsMetaInvalidUrlWarned?: boolean;
};

function getRedisProvider(): RedisProvider | undefined {
  const restUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  const globalState = globalThis as RedisGlobal;
  if (restUrl && restToken) {
    globalState.__rivalsMetaUpstash ??= new UpstashRedis({
      url: restUrl,
      token: restToken,
      automaticDeserialization: false
    });
    return { kind: "upstash", client: globalState.__rivalsMetaUpstash };
  }
  if (restUrl || restToken) {
    console.warn("[rivalsmeta-cache] Both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required");
  }

  const url = process.env.REDIS_URL?.trim();
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) {
    if (!globalState.__rivalsMetaInvalidUrlWarned) {
      console.warn("[rivalsmeta-cache] REDIS_URL uses HTTP(S) and cannot be used by ioredis; configure Upstash REST variables instead");
      globalState.__rivalsMetaInvalidUrlWarned = true;
    }
    return undefined;
  }
  if (!/^rediss?:\/\//i.test(url)) {
    if (!globalState.__rivalsMetaInvalidUrlWarned) {
      console.warn("[rivalsmeta-cache] REDIS_URL must start with redis:// or rediss://");
      globalState.__rivalsMetaInvalidUrlWarned = true;
    }
    return undefined;
  }
  if (!globalState.__rivalsMetaIORedis) {
    globalState.__rivalsMetaIORedis = new IORedis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: true,
      tls: url.startsWith("rediss://") ? {} : undefined,
      connectTimeout: 10_000,
      commandTimeout: 10_000
    });
    globalState.__rivalsMetaIORedis.on("error", () => {
      // Individual operations report failures and fall back to memory cache.
    });
  }
  return { kind: "ioredis", client: globalState.__rivalsMetaIORedis };
}

async function ensureIORedisReady(redis: IORedis): Promise<void> {
  if (redis.status === "ready") return;
  if (redis.status === "wait" || redis.status === "end") {
    await redis.connect();
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`ioredis did not become ready (status: ${redis.status})`));
    }, 10_000);
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      clearTimeout(timeout);
      redis.off("ready", onReady);
      redis.off("error", onError);
    };
    redis.once("ready", onReady);
    redis.once("error", onError);
  });
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
  const provider = getRedisProvider();
  if (!provider) return undefined;
  try {
    if (provider.kind === "ioredis") await ensureIORedisReady(provider.client);
    const value = provider.kind === "upstash"
      ? await provider.client.get<string>(RIVALSMETA_CACHE_KEYS[kind])
      : await provider.client.get(RIVALSMETA_CACHE_KEYS[kind]);
    return value ? deserialize(value) : undefined;
  } catch (error) {
    console.warn(`[rivalsmeta-cache] Redis ${kind} read failed`, error);
    return undefined;
  }
}

export async function writeRedisSnapshot(snapshot: CachedHeroSnapshot, ttlSeconds: number): Promise<boolean> {
  const provider = getRedisProvider();
  if (!provider) return false;
  try {
    const value = serialize(snapshot);
    if (provider.kind === "upstash") {
      const pipeline = provider.client.pipeline();
      pipeline.set(RIVALSMETA_CACHE_KEYS.current, value, { ex: ttlSeconds });
      pipeline.set(RIVALSMETA_CACHE_KEYS.lastSuccess, value);
      pipeline.set(RIVALSMETA_CACHE_KEYS.lastRefreshAt, snapshot.updatedAt.toISOString());
      await pipeline.exec();
    } else {
      await ensureIORedisReady(provider.client);
      const pipeline = provider.client.multi();
      pipeline.set(RIVALSMETA_CACHE_KEYS.current, value, "EX", ttlSeconds);
      pipeline.set(RIVALSMETA_CACHE_KEYS.lastSuccess, value);
      pipeline.set(RIVALSMETA_CACHE_KEYS.lastRefreshAt, snapshot.updatedAt.toISOString());
      await pipeline.exec();
    }
    return true;
  } catch (error) {
    console.warn("[rivalsmeta-cache] Redis write failed", error);
    return false;
  }
}

export async function acquireRedisRefreshLock(token: string, ttlSeconds = 600): Promise<boolean | undefined> {
  const provider = getRedisProvider();
  if (!provider) return undefined;
  try {
    if (provider.kind === "upstash") {
      return (await provider.client.set(RIVALSMETA_CACHE_KEYS.refreshLock, token, { ex: ttlSeconds, nx: true })) === "OK";
    }
    await ensureIORedisReady(provider.client);
    return (await provider.client.set(RIVALSMETA_CACHE_KEYS.refreshLock, token, "EX", ttlSeconds, "NX")) === "OK";
  } catch (error) {
    console.warn("[rivalsmeta-cache] Redis lock failed", error);
    return undefined;
  }
}

export async function releaseRedisRefreshLock(token: string): Promise<void> {
  const provider = getRedisProvider();
  if (!provider) return;
  try {
    const script = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
    if (provider.kind === "upstash") {
      await provider.client.eval(script, [RIVALSMETA_CACHE_KEYS.refreshLock], [token]);
    } else {
      await ensureIORedisReady(provider.client);
      await provider.client.eval(script, 1, RIVALSMETA_CACHE_KEYS.refreshLock, token);
    }
  } catch (error) {
    console.warn("[rivalsmeta-cache] Redis unlock failed", error);
  }
}
