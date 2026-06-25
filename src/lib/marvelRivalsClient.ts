import { config } from "@/lib/config";
import type { PlayerDetail, PlayerHeroStat, PlayerMatch, PlayerProfile, PlayerSummary } from "@/lib/types";

class UpstreamError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

type RawIcon = {
  player_icon_id?: string | number | null;
  player_icon?: string | null;
  banner?: string | null;
};

type RawRank = {
  rank?: string | null;
  score?: string | number | null;
  unit?: string | null;
  icon?: string | null;
  color?: string | null;
  peak_rank?: RawRank | null;
};

type RawPlayer = {
  uid?: string | number | null;
  level?: string | number | null;
  name?: string | null;
  icon?: RawIcon | null;
  rank?: RawRank | null;
  isPrivate?: boolean | null;
};

interface RawPlayerResponse {
  uid?: string | number | null;
  name?: string | null;
  player?: RawPlayer | null;
  isPrivate?: boolean | null;
}

type RawOverallStats = {
  total_matches?: number | null;
  total_wins?: {
    wins?: number | null;
    win_percentage?: {
      percentile_raw?: number | null;
    } | null;
  } | null;
  overall_kda?: {
    kda?: number | null;
  } | null;
  total_kills?: {
    kills?: number | null;
  } | null;
  total_deaths?: {
    deaths?: number | null;
  } | null;
  total_assists?: {
    assists?: number | null;
  } | null;
};

type RawHeroRanked = {
  hero_id?: string | number | null;
  hero_name?: string | null;
  hero_thumbnail?: string | null;
  matches?: number | null;
  wins?: number | null;
  kills?: number | null;
  deaths?: number | null;
  assists?: number | null;
  play_time?: number | null;
};

type RawMatchHistory = {
  match_uid?: string | number | null;
  map_id?: string | number | null;
  match_time_stamp?: number | null;
  player_performance?: {
    hero_id?: string | number | null;
    hero_name?: string | null;
    kills?: number | null;
    deaths?: number | null;
    assists?: number | null;
    is_win?: {
      is_win?: boolean | null;
    } | null;
  } | null;
};

interface RawPlayerDetailResponse extends RawPlayerResponse {
  overall_stats?: RawOverallStats | null;
  heroes_ranked?: RawHeroRanked[] | null;
  match_history?: RawMatchHistory[] | null;
}

const ASSET_BASE_URL = "https://marvelrivalsapi.com/rivals";

const sample = (nickname: string): PlayerDetail => ({
  profile: {
    playerId: `mock-${nickname}`,
    nickname,
    level: 42,
    rank: "Diamond III",
    avatarUrl: toAssetUrl("/icons/default.png")
  },
  summary: {
    playerId: `mock-${nickname}`,
    winRate: 53.7,
    matchesPlayed: 186,
    favoriteHero: "Luna Snow",
    kda: 2.84
  },
  heroes: [
    { heroId: "luna-snow", heroName: "Luna Snow", matches: 61, winRate: 57.4, pickRate: 32.8, kda: 3.12 },
    { heroId: "magneto", heroName: "Magneto", matches: 37, winRate: 51.4, pickRate: 19.9, kda: 2.35 }
  ],
  matches: [
    { matchId: "m1", playedAt: new Date().toISOString(), result: "WIN", heroName: "Luna Snow", kda: 3.4, map: "Yggsgard" },
    { matchId: "m2", playedAt: new Date(Date.now() - 3600000).toISOString(), result: "LOSS", heroName: "Magneto", kda: 1.8, map: "Tokyo 2099" }
  ]
});

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    headers: { "x-api-key": config.apiKey ?? "" },
    signal: AbortSignal.timeout(8000),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new UpstreamError(`Marvel Rivals API failed (${response.status})`, response.status);
  }

  return response.json() as Promise<T>;
}

function toAssetUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  const trimmed = path.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${ASSET_BASE_URL}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
}

function toNumber(value: string | number | null | undefined): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function assertPublicProfile(raw: RawPlayerResponse): void {
  if (raw.isPrivate === true || raw.player?.isPrivate === true) {
    throw new Error("PRIVATE_PROFILE");
  }
}

function mapProfile(raw: RawPlayerResponse): PlayerProfile {
  assertPublicProfile(raw);

  const player = raw.player;
  const uid = player?.uid ?? raw.uid;
  const name = player?.name ?? raw.name;

  return {
    playerId: String(uid ?? ""),
    nickname: String(name ?? ""),
    level: toNumber(player?.level),
    rank: player?.rank?.rank ?? undefined,
    avatarUrl: toAssetUrl(player?.icon?.player_icon)
  };
}

function mapSummary(raw: RawPlayerDetailResponse, playerId: string): PlayerSummary {
  const stats = raw.overall_stats;
  const matchesPlayed = stats?.total_matches ?? 0;
  const wins = stats?.total_wins?.wins ?? 0;
  const sortedHeroes = [...(raw.heroes_ranked ?? [])].sort((a, b) => (b.matches ?? 0) - (a.matches ?? 0));
  const winRate = matchesPlayed > 0 ? round((wins / matchesPlayed) * 100, 1) : 0;

  return {
    playerId,
    matchesPlayed,
    winRate,
    favoriteHero: sortedHeroes[0]?.hero_name ?? undefined,
    kda: stats?.overall_kda?.kda ?? undefined
  };
}

function mapHeroes(raw: RawPlayerDetailResponse): PlayerHeroStat[] {
  return (raw.heroes_ranked ?? []).map((hero) => {
    const matches = hero.matches ?? 0;
    const wins = hero.wins ?? 0;
    const kills = hero.kills ?? 0;
    const assists = hero.assists ?? 0;
    const deaths = hero.deaths ?? 0;

    return {
      heroId: String(hero.hero_id ?? ""),
      heroName: hero.hero_name ?? "Unknown Hero",
      matches,
      winRate: matches > 0 ? round((wins / matches) * 100, 1) : 0,
      kda: round((kills + assists) / Math.max(deaths, 1), 2)
    };
  });
}

function mapMatches(raw: RawPlayerDetailResponse): PlayerMatch[] {
  return (raw.match_history ?? []).map((match) => {
    const performance = match.player_performance;
    const kills = performance?.kills ?? 0;
    const assists = performance?.assists ?? 0;
    const deaths = performance?.deaths ?? 0;
    const playedAtMs = (match.match_time_stamp ?? 0) * 1000;

    return {
      matchId: String(match.match_uid ?? ""),
      playedAt: new Date(playedAtMs).toISOString(),
      result: performance?.is_win?.is_win ? "WIN" : "LOSS",
      heroName: performance?.hero_name ?? "Unknown Hero",
      kda: round((kills + assists) / Math.max(deaths, 1), 2),
      map: match.map_id === null || match.map_id === undefined ? undefined : String(match.map_id)
    };
  });
}

function mapDetail(raw: RawPlayerDetailResponse): PlayerDetail {
  const profile = mapProfile(raw);

  return {
    profile,
    summary: mapSummary(raw, profile.playerId),
    heroes: mapHeroes(raw),
    matches: mapMatches(raw)
  };
}

export const marvelClient = {
  async searchPlayer(nickname: string): Promise<PlayerProfile> {
    if (config.useMock) return sample(nickname).profile;

    const raw = await request<RawPlayerResponse>(`/player/${encodeURIComponent(nickname)}`);
    return mapProfile(raw);
  },

  async getPlayer(playerId: string): Promise<PlayerDetail> {
    if (config.useMock) return sample(playerId.replace(/^mock-/, ""));

    const raw = await request<RawPlayerDetailResponse>(`/player/${encodeURIComponent(playerId)}`);
    return mapDetail(raw);
  }
};

export { UpstreamError };
