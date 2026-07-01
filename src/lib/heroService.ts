import { adaptRivalsMetaHeroes } from "@/lib/heroAdapter";
import { fetchOfficialHeroTsv, OFFICIAL_HERO_PC_URL } from "@/lib/officialHeroClient";
import { HERO_TIERS, parseHeroTsv, type HeroMeta, type HeroMode, type HeroTier } from "@/lib/officialHeroParser";
import { fetchRivalsMetaTierList } from "@/lib/rivalsMetaClient";
import { parseRivalsMetaTierList } from "@/lib/rivalsMetaParser";
import {
  acquireRedisRefreshLock,
  readRedisSnapshot,
  releaseRedisRefreshLock,
  writeRedisSnapshot,
  type CachedHeroSnapshot
} from "@/lib/rivalsMetaCache";

const MIN_REFRESH_INTERVAL_HOURS = 24;
const configuredHours = Number(
  process.env.RIVALSMETA_REFRESH_INTERVAL_HOURS ??
  process.env.META_CACHE_TTL_HOURS ??
  MIN_REFRESH_INTERVAL_HOURS
);
export const CACHE_TTL_MS =
  Math.max(Number.isFinite(configuredHours) ? configuredHours : MIN_REFRESH_INTERVAL_HOURS, MIN_REFRESH_INTERVAL_HOURS) * 60 * 60 * 1000;
const CACHE_TTL_SECONDS = Math.floor(CACHE_TTL_MS / 1000);

type GlobalCache = typeof globalThis & {
  __heroMetaCache?: CachedHeroSnapshot;
  __heroMetaMemoryLock?: boolean;
};
const shared = globalThis as GlobalCache;

export type HeroSource = "rivalsmeta" | "official";
export type HeroSort = "pickRate" | "winRate" | "hero";
export type HeroFilters = {
  platform?: string;
  mode?: HeroMode;
  tier?: HeroTier;
  role?: string;
  season?: string;
  rankFilter?: string;
  metaTier?: string;
  sort?: HeroSort;
};
export type HeroResult = Omit<CachedHeroSnapshot, "expiresAt"> & { stale: boolean };

export class RefreshInProgressError extends Error {
  constructor() {
    super("RivalsMeta refresh is already in progress");
    this.name = "RefreshInProgressError";
  }
}

function result(snapshot: CachedHeroSnapshot, stale: boolean): HeroResult {
  const { expiresAt: _, ...value } = snapshot;
  return { ...value, stale };
}

async function fetchRivalsMetaSnapshot(): Promise<CachedHeroSnapshot> {
  const page = await fetchRivalsMetaTierList();
  const dataset = parseRivalsMetaTierList(page.html, { sourceUrl: page.sourceUrl, updatedAt: page.fetchedAt });
  return {
    data: adaptRivalsMetaHeroes(dataset.heroes),
    source: "rivalsmeta",
    sourceUrl: dataset.sourceUrl,
    season: dataset.season,
    availableRankFilters: dataset.rankFilters,
    partialErrors: dataset.errors,
    updatedAt: dataset.updatedAt,
    expiresAt: Date.now() + CACHE_TTL_MS
  };
}

async function fetchOfficialSnapshot(): Promise<CachedHeroSnapshot> {
  const data = parseHeroTsv(await fetchOfficialHeroTsv());
  return {
    data,
    source: "official",
    sourceUrl: OFFICIAL_HERO_PC_URL,
    season: "",
    availableRankFilters: [],
    partialErrors: [],
    updatedAt: data[0].updatedAt,
    expiresAt: Date.now() + CACHE_TTL_MS
  };
}

/**
 * Read path only: Redis current -> Redis stale -> memory -> official fallback.
 * It never calls RivalsMeta; that is reserved for refreshHeroes().
 */
export async function getHeroes(now = Date.now()): Promise<HeroResult> {
  const current = await readRedisSnapshot("current");
  if (current) {
    shared.__heroMetaCache = current;
    return result(current, false);
  }

  const lastSuccess = await readRedisSnapshot("lastSuccess");
  if (lastSuccess) {
    shared.__heroMetaCache = lastSuccess;
    return result(lastSuccess, true);
  }

  if (shared.__heroMetaCache) return result(shared.__heroMetaCache, shared.__heroMetaCache.expiresAt <= now);

  const official = await fetchOfficialSnapshot();
  shared.__heroMetaCache = official;
  return result(official, false);
}

/** Refresh path only: protected admin/cron callers fetch RivalsMeta and replace shared caches. */
export async function refreshHeroes(): Promise<HeroResult> {
  const lockToken = crypto.randomUUID();
  const redisLock = await acquireRedisRefreshLock(lockToken);
  const usingMemoryLock = redisLock === undefined;
  if (redisLock === false || (usingMemoryLock && shared.__heroMetaMemoryLock)) throw new RefreshInProgressError();
  if (usingMemoryLock) shared.__heroMetaMemoryLock = true;

  try {
    const snapshot = await fetchRivalsMetaSnapshot();
    shared.__heroMetaCache = snapshot;
    await writeRedisSnapshot(snapshot, CACHE_TTL_SECONDS);
    return result(snapshot, false);
  } finally {
    if (usingMemoryLock) shared.__heroMetaMemoryLock = false;
    else await releaseRedisRefreshLock(lockToken);
  }
}

export function filterHeroes(heroes: HeroMeta[], filters: HeroFilters): HeroMeta[] {
  const filtered = heroes.filter((hero) =>
    (!filters.platform || hero.platform.toLowerCase() === filters.platform.toLowerCase()) &&
    (!filters.mode || hero.mode === filters.mode) &&
    (!filters.tier || hero.tier === filters.tier) &&
    (!filters.role || hero.role.toLowerCase() === filters.role.toLowerCase()) &&
    (!filters.season || hero.season === filters.season) &&
    (!filters.rankFilter || hero.rankFilter === filters.rankFilter) &&
    (!filters.metaTier || hero.metaTier === filters.metaTier)
  );
  const sort = filters.sort ?? "pickRate";
  return [...filtered].sort((a, b) =>
    sort === "hero" ? a.hero.localeCompare(b.hero) : b[sort] - a[sort] || a.hero.localeCompare(b.hero)
  );
}

export function isHeroTier(value: string | null): value is HeroTier {
  return value !== null && (HERO_TIERS as readonly string[]).includes(value);
}
