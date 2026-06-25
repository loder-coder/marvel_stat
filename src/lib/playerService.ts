import { getBudgetState, reserveApiCall } from "@/lib/apiBudget";
import { acquireLock, cacheState, getCached, releaseLock, setCached } from "@/lib/cache";
import { config } from "@/lib/config";
import { marvelClient, UpstreamError } from "@/lib/marvelRivalsClient";
import { normalizeNickname } from "@/lib/normalize";
import type { CacheMeta, PlayerDetail, PlayerProfile, WithMeta } from "@/lib/types";

const meta = (source: CacheMeta["source"], fetchedAt: string, freshUntil: string, isStale: boolean, refreshBlockedReason?: CacheMeta["refreshBlockedReason"]): CacheMeta => ({ source, fetchedAt, expiresAt: freshUntil, isStale, refreshBlockedReason });
const searchKey = (name: string) => `marvel:player-search:${name}`;
const profileKey = (id: string) => `marvel:player:${id}:profile`;
const ttl = { search: [15 * 60, 60 * 60], profile: [12 * 60, 60 * 60], summary: [8 * 60, 45 * 60], heroes: [12 * 60, 60 * 60], matches: [3 * 60, 20 * 60] } as const;

async function cacheDetail(detail: PlayerDetail) {
  const id = detail.profile.playerId;
  await Promise.all([
    setCached(profileKey(id), detail.profile, ...ttl.profile),
    setCached(`marvel:player:${id}:summary`, detail.summary, ...ttl.summary),
    setCached(`marvel:player:${id}:heroes`, detail.heroes ?? [], ...ttl.heroes),
    setCached(`marvel:player:${id}:matches`, detail.matches ?? [], ...ttl.matches),
    setCached(`marvel:player:${id}:recent`, detail.matches?.slice(0, 5) ?? [], ...ttl.matches),
    setCached(`marvel:player:${id}:cache-status`, { refreshedAt: new Date().toISOString() }, ...ttl.profile)
  ]);
}
async function fetchDetail(playerId: string): Promise<WithMeta<PlayerDetail>> {
  const reservation = await reserveApiCall();
  if (!reservation.allowed) throw new Error("DAILY_BUDGET");
  try { const detail = await marvelClient.getPlayer(playerId); await cacheDetail(detail); return { data: detail, cache: meta(config.useMock ? "mock" : "api", new Date().toISOString(), new Date(Date.now() + ttl.profile[0] * 1000).toISOString(), false) }; }
  catch (error) { if (error instanceof UpstreamError && error.status === 429) throw new Error("RATE_LIMIT"); throw error; }
}
export async function searchPlayer(nickname: string): Promise<WithMeta<PlayerProfile>> {
  const normalized = normalizeNickname(nickname); if (!normalized) throw new Error("INVALID_NICKNAME");
  const cached = await getCached<PlayerProfile>(searchKey(normalized));
  if (cached && cacheState(cached) === "fresh") return { data: cached.value, cache: meta("fresh-cache", cached.fetchedAt, cached.freshUntil, false) };
  const budget = await getBudgetState();
  if (cached && budget.mode !== "normal") return { data: cached.value, cache: meta("stale-cache", cached.fetchedAt, cached.freshUntil, true, "daily-budget") };
  const lockKey = `marvel:lock:player-search:${normalized}`; const lock = await acquireLock(lockKey, 12);
  if (!lock) { if (cached) return { data: cached.value, cache: meta("stale-cache", cached.fetchedAt, cached.freshUntil, true, "lock-active") }; throw new Error("REFRESH_IN_PROGRESS"); }
  try {
    const reservation = await reserveApiCall();
    if (!reservation.allowed) { if (cached) return { data: cached.value, cache: meta("stale-cache", cached.fetchedAt, cached.freshUntil, true, "daily-budget") }; throw new Error("DAILY_BUDGET"); }
    const profile = await marvelClient.searchPlayer(nickname.trim()); const durations: [number, number] = budget.mode === "soft" ? [30 * 60, 2 * 60 * 60] : [ttl.search[0], ttl.search[1]]; const saved = await setCached(searchKey(normalized), profile, ...durations);
    return { data: profile, cache: meta(config.useMock ? "mock" : "api", saved.fetchedAt, saved.freshUntil, false) };
  } catch (error) {
    const reason = error instanceof UpstreamError && error.status === 429 ? "rate-limit" : "api-error";
    if (cached) return { data: cached.value, cache: meta("stale-cache", cached.fetchedAt, cached.freshUntil, true, reason) }; throw error;
  } finally { await releaseLock(lockKey, lock); }
}
export async function getPlayerProfile(playerId: string): Promise<WithMeta<PlayerProfile>> {
  const cached = await getCached<PlayerProfile>(profileKey(playerId));
  if (cached && cacheState(cached) === "fresh") return { data: cached.value, cache: meta("fresh-cache", cached.fetchedAt, cached.freshUntil, false) };
  if (cached) return { data: cached.value, cache: meta("stale-cache", cached.fetchedAt, cached.freshUntil, true) };
  const result = await refreshPlayer(playerId); return { data: result.data.profile, cache: result.cache };
}
export async function getPlayerDetail(playerId: string): Promise<WithMeta<PlayerDetail>> {
  const profile = await getCached<PlayerProfile>(profileKey(playerId));
  const summary = await getCached<PlayerDetail["summary"]>(`marvel:player:${playerId}:summary`);
  const heroes = await getCached<NonNullable<PlayerDetail["heroes"]>>(`marvel:player:${playerId}:heroes`);
  const matches = await getCached<NonNullable<PlayerDetail["matches"]>>(`marvel:player:${playerId}:matches`);
  if (profile && summary && heroes && matches && cacheState(profile) === "fresh" && cacheState(summary) === "fresh" && cacheState(heroes) === "fresh" && cacheState(matches) === "fresh") return { data: { profile: profile.value, summary: summary.value, heroes: heroes.value, matches: matches.value }, cache: meta("fresh-cache", profile.fetchedAt, profile.freshUntil, false) };
  if (profile) return { data: { profile: profile.value, summary: summary?.value, heroes: heroes?.value, matches: matches?.value }, cache: meta("stale-cache", profile.fetchedAt, profile.freshUntil, true) };
  return refreshPlayer(playerId);
}
export async function refreshPlayer(playerId: string): Promise<WithMeta<PlayerDetail>> {
  const stale = await getCached<PlayerProfile>(profileKey(playerId)); const budget = await getBudgetState();
  if (budget.mode === "hard") { if (stale) return getPlayerDetail(playerId); throw new Error("DAILY_BUDGET"); }
  const lockKey = `marvel:lock:player:${playerId}:refresh`; const lock = await acquireLock(lockKey, 20);
  if (!lock) { if (stale) return getPlayerDetail(playerId); throw new Error("REFRESH_IN_PROGRESS"); }
  try { return await fetchDetail(playerId); } catch (error) { if (stale) return getPlayerDetail(playerId); throw error; } finally { await releaseLock(lockKey, lock); }
}
