import { fetchOfficialHeroTsv } from "@/lib/officialHeroClient";
import { HERO_TIERS, parseHeroTsv, type HeroMeta, type HeroMode, type HeroTier } from "@/lib/officialHeroParser";

const CACHE_TTL_MS = 30 * 60 * 1000;
type Cache = { data: HeroMeta[]; expiresAt: number };
type GlobalCache = typeof globalThis & { __heroMetaCache?: Cache; __heroMetaRequest?: Promise<HeroMeta[]> };
const shared = globalThis as GlobalCache;

export type HeroSort = "pickRate" | "winRate" | "hero";
export type HeroFilters = {
  platform?: string;
  mode?: HeroMode;
  tier?: HeroTier;
  role?: string;
  sort?: HeroSort;
};

export type HeroResult = { data: HeroMeta[]; stale: boolean };

/** Returns cached official data, retaining the last successful response on upstream failure. */
export async function getHeroes(now = Date.now()): Promise<HeroResult> {
  if (shared.__heroMetaCache && shared.__heroMetaCache.expiresAt > now) {
    return { data: shared.__heroMetaCache.data, stale: false };
  }

  if (!shared.__heroMetaRequest) {
    shared.__heroMetaRequest = fetchOfficialHeroTsv()
      .then(parseHeroTsv)
      .then((data) => {
        shared.__heroMetaCache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
        return data;
      })
      .finally(() => {
        shared.__heroMetaRequest = undefined;
      });
  }

  try {
    return { data: await shared.__heroMetaRequest, stale: false };
  } catch (error) {
    if (shared.__heroMetaCache) return { data: shared.__heroMetaCache.data, stale: true };
    throw error;
  }
}

/** Applies API filters and deterministic sorting without mutating cached records. */
export function filterHeroes(heroes: HeroMeta[], filters: HeroFilters): HeroMeta[] {
  const filtered = heroes.filter((hero) =>
    (!filters.platform || hero.platform.toLowerCase() === filters.platform.toLowerCase()) &&
    (!filters.mode || hero.mode === filters.mode) &&
    (!filters.tier || hero.tier === filters.tier) &&
    (!filters.role || hero.role.toLowerCase() === filters.role.toLowerCase())
  );
  const sort = filters.sort ?? "pickRate";
  return [...filtered].sort((a, b) =>
    sort === "hero"
      ? a.hero.localeCompare(b.hero)
      : b[sort] - a[sort] || a.hero.localeCompare(b.hero)
  );
}

export function isHeroTier(value: string | null): value is HeroTier {
  return value !== null && (HERO_TIERS as readonly string[]).includes(value);
}
