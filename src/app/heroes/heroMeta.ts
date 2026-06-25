export type HeroMeta = {
  heroId: string;
  heroName: string;
  role: string;
  thumbnail: string;
  matches: number;
  winRate: number;
  kda: number;
  totalDamage: number;
  totalHeal: number;
  hitRate: number;
};

type RawHero = {
  id?: number | string | null;
  name?: string | null;
  role?: string | null;
  thumbnail?: string | null;
};

type RawHeroStats = {
  hero_id?: number | string | null;
  hero_name?: string | null;
  hero_icon?: string | null;
  matches?: number | null;
  wins?: number | null;
  k?: number | null;
  d?: number | null;
  a?: number | null;
  play_time?: string | null;
  total_hero_damage?: number | null;
  total_hero_heal?: number | null;
  total_damage_taken?: number | null;
  session_hit_rate?: number | null;
  solo_kill?: number | null;
};

const API_BASE_URL = "https://marvelrivalsapi.com/api/v1";
const ASSET_BASE_URL = "https://marvelrivalsapi.com/rivals";

export const MOCK_HERO_META: HeroMeta[] = [
  { heroId: "1011001", heroName: "Luna Snow", role: "Strategist", thumbnail: "", matches: 5000, winRate: 54.0, kda: 3.0, totalDamage: 900000000, totalHeal: 1200000000, hitRate: 62.0 },
  { heroId: "1011002", heroName: "Magneto", role: "Vanguard", thumbnail: "", matches: 3800, winRate: 51.2, kda: 2.4, totalDamage: 1100000000, totalHeal: 0, hitRate: 55.0 },
  { heroId: "1011003", heroName: "Spider-Man", role: "Duelist", thumbnail: "", matches: 4200, winRate: 48.7, kda: 2.8, totalDamage: 1300000000, totalHeal: 0, hitRate: 71.0 },
  { heroId: "1011004", heroName: "Scarlet Witch", role: "Duelist", thumbnail: "", matches: 2900, winRate: 52.3, kda: 2.6, totalDamage: 1050000000, totalHeal: 0, hitRate: 58.0 },
  { heroId: "1011005", heroName: "Thor", role: "Vanguard", thumbnail: "", matches: 3100, winRate: 49.8, kda: 2.1, totalDamage: 980000000, totalHeal: 0, hitRate: 61.0 }
];

function useMockData(): boolean {
  return process.env.USE_MOCK_DATA === "true" || !process.env.MARVEL_RIVALS_API_KEY;
}

function toAssetUrl(path?: string | null): string {
  if (!path?.trim()) return "";
  const trimmed = path.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${ASSET_BASE_URL}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { "x-api-key": process.env.MARVEL_RIVALS_API_KEY ?? "" },
    next: { revalidate: 3600 }
  });

  if (!response.ok) {
    throw new Error(`Marvel Rivals API failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

function mapHeroMeta(hero: RawHero, stats: RawHeroStats): HeroMeta {
  const matches = stats.matches ?? 0;
  const wins = stats.wins ?? 0;
  const kills = stats.k ?? 0;
  const deaths = stats.d ?? 0;
  const assists = stats.a ?? 0;

  return {
    heroId: String(stats.hero_id ?? hero.id ?? ""),
    heroName: stats.hero_name ?? hero.name ?? "Unknown Hero",
    role: hero.role ?? "Unknown",
    thumbnail: toAssetUrl(stats.hero_icon ?? hero.thumbnail),
    matches,
    winRate: matches > 0 ? round((wins / matches) * 100, 1) : 0,
    kda: round((kills + assists) / Math.max(deaths, 1), 2),
    totalDamage: stats.total_hero_damage ?? 0,
    totalHeal: stats.total_hero_heal ?? 0,
    hitRate: round((stats.session_hit_rate ?? 0) * 100, 1)
  };
}

export async function getHeroMeta(): Promise<HeroMeta[]> {
  if (useMockData()) return MOCK_HERO_META;

  const heroes = await fetchJson<RawHero[]>(`${API_BASE_URL}/heroes`);
  const statsResults = await Promise.allSettled(
    heroes
      .filter((hero) => hero.name)
      .map(async (hero) => {
        const stats = await fetchJson<RawHeroStats>(`${API_BASE_URL}/heroes/hero/${encodeURIComponent(hero.name ?? "")}/stats`);
        return mapHeroMeta(hero, stats);
      })
  );

  return statsResults.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
}
