export type Tier = "S" | "A" | "B" | "C" | "D" | "\uAD8C\uC678";
export type HeroStatsStatus = "ok" | "api-failed" | "invalid-response" | "missing-name";

export type HeroMeta = {
  heroId: string;
  heroName: string;
  role: string;
  thumbnail: string;
  matches: number;
  winRate: number;
  kda: number;
  tier: Tier;
  totalDamage: number;
  totalHeal: number;
  hitRate: number;
  statsStatus: HeroStatsStatus;
  statsStatusDetail?: string;
};

export type HeroTranslationInput = {
  heroId: string;
  nameKo: string;
  roleKo: string;
};

type HeroTranslation = HeroTranslationInput & {
  updatedAt?: Date | string;
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
const SUPABASE_TABLE = "HeroTranslation";

export const TIER_ORDER: Record<Tier, number> = { S: 0, A: 1, B: 2, C: 3, D: 4, "\uAD8C\uC678": 5 };
export const ROLE_KO_OPTIONS = ["\uACF5\uACA9\uD615", "\uC218\uD638\uD615", "\uC9C0\uC6D0\uD615"] as const;

export const ROLE_TRANSLATIONS: Record<string, string> = {
  Duelist: "\uACF5\uACA9\uD615",
  Vanguard: "\uC218\uD638\uD615",
  Strategist: "\uC9C0\uC6D0\uD615"
};

export const MOCK_HERO_META: HeroMeta[] = [
  { heroId: "1011001", heroName: "Luna Snow", role: "Strategist", thumbnail: "", matches: 5000, winRate: 54.0, kda: 3.0, tier: "S", totalDamage: 900000000, totalHeal: 1200000000, hitRate: 62.0, statsStatus: "ok" },
  { heroId: "1011002", heroName: "Magneto", role: "Vanguard", thumbnail: "", matches: 3800, winRate: 51.2, kda: 2.4, tier: "B", totalDamage: 1100000000, totalHeal: 0, hitRate: 55.0, statsStatus: "ok" },
  { heroId: "1011003", heroName: "Spider-Man", role: "Duelist", thumbnail: "", matches: 4200, winRate: 48.7, kda: 2.8, tier: "D", totalDamage: 1300000000, totalHeal: 0, hitRate: 71.0, statsStatus: "ok" },
  { heroId: "1011004", heroName: "Scarlet Witch", role: "Duelist", thumbnail: "", matches: 2900, winRate: 52.3, kda: 2.6, tier: "A", totalDamage: 1050000000, totalHeal: 0, hitRate: 58.0, statsStatus: "ok" },
  { heroId: "1011005", heroName: "Thor", role: "Vanguard", thumbnail: "", matches: 3100, winRate: 49.8, kda: 2.1, tier: "C", totalDamage: 980000000, totalHeal: 0, hitRate: 61.0, statsStatus: "ok" }
];

function useMockData(): boolean {
  return process.env.USE_MOCK_DATA === "true" || !process.env.MARVEL_RIVALS_API_KEY;
}

function getSupabaseConfig(): { url: string; key: string } | undefined {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : undefined;
}

function canUseDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

type HeroTranslationDelegate = {
  findMany: () => Promise<HeroTranslation[]>;
  upsert: (args: {
    where: { heroId: string };
    create: HeroTranslationInput;
    update: Omit<HeroTranslationInput, "heroId">;
  }) => Promise<unknown>;
};

async function getHeroTranslationDelegate(): Promise<HeroTranslationDelegate | undefined> {
  if (!canUseDatabase()) return undefined;

  try {
    const { PrismaClient } = await import("@prisma/client");
    const globalForPrisma = globalThis as unknown as { heroMetaPrisma?: InstanceType<typeof PrismaClient> };
    const prisma = globalForPrisma.heroMetaPrisma ?? new PrismaClient();
    if (process.env.NODE_ENV !== "production") globalForPrisma.heroMetaPrisma = prisma;

    const client = prisma as unknown as { heroTranslation?: HeroTranslationDelegate };
    return client.heroTranslation;
  } catch {
    return undefined;
  }
}

function supabaseHeaders(key: string): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json"
  };
}

async function getTranslationsFromSupabase(): Promise<HeroTranslation[]> {
  const config = getSupabaseConfig();
  if (!config) return [];

  const response = await fetch(`${config.url}/rest/v1/${SUPABASE_TABLE}?select=heroId,nameKo,roleKo,updatedAt`, {
    headers: supabaseHeaders(config.key),
    cache: "no-store"
  });

  if (!response.ok) throw new Error(`Supabase translation fetch failed (${response.status})`);
  return response.json() as Promise<HeroTranslation[]>;
}

async function upsertTranslationToSupabase(input: HeroTranslationInput): Promise<void> {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase env vars are required.");

  const response = await fetch(`${config.url}/rest/v1/${SUPABASE_TABLE}?on_conflict=heroId`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(config.key),
      Prefer: "resolution=merge-duplicates"
    },
    body: JSON.stringify({
      ...input,
      updatedAt: new Date().toISOString()
    })
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Supabase translation upsert failed (${response.status}) ${message}`);
  }
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

export function calcTier(matches: number, winRate: number): Tier {
  if (matches < 100) return "\uAD8C\uC678";
  if (matches >= 1000 && winRate >= 52.5) return "S";
  if (matches >= 500 && winRate >= 51.5) return "A";
  if (matches >= 300 && winRate >= 50.5) return "B";
  if (matches >= 100 && winRate >= 49.5) return "C";
  return "D";
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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function hasRecognizedStats(stats: RawHeroStats): boolean {
  return (
    typeof stats.matches === "number" ||
    typeof stats.wins === "number" ||
    typeof stats.k === "number" ||
    typeof stats.d === "number" ||
    typeof stats.a === "number"
  );
}

function mapHeroMeta(hero: RawHero, stats: RawHeroStats): HeroMeta {
  const matches = stats.matches ?? 0;
  const wins = stats.wins ?? 0;
  const kills = stats.k ?? 0;
  const deaths = stats.d ?? 0;
  const assists = stats.a ?? 0;
  const winRate = matches > 0 ? round((wins / matches) * 100, 1) : 0;

  return {
    heroId: String(stats.hero_id ?? hero.id ?? ""),
    heroName: stats.hero_name ?? hero.name ?? "Unknown Hero",
    role: hero.role ?? "Unknown",
    thumbnail: toAssetUrl(stats.hero_icon ?? hero.thumbnail),
    matches,
    winRate,
    kda: round((kills + assists) / Math.max(deaths, 1), 2),
    tier: calcTier(matches, winRate),
    totalDamage: stats.total_hero_damage ?? 0,
    totalHeal: stats.total_hero_heal ?? 0,
    hitRate: round((stats.session_hit_rate ?? 0) * 100, 1),
    statsStatus: hasRecognizedStats(stats) ? "ok" : "invalid-response",
    statsStatusDetail: hasRecognizedStats(stats) ? undefined : "Stats response did not include expected numeric fields."
  };
}

function mapHeroWithoutStats(hero: RawHero, statsStatus: HeroStatsStatus, statsStatusDetail?: string): HeroMeta {
  return {
    heroId: String(hero.id ?? hero.name ?? ""),
    heroName: hero.name ?? "Unknown Hero",
    role: hero.role ?? "Unknown",
    thumbnail: toAssetUrl(hero.thumbnail),
    matches: 0,
    winRate: 0,
    kda: 0,
    tier: "\uAD8C\uC678",
    totalDamage: 0,
    totalHeal: 0,
    hitRate: 0,
    statsStatus,
    statsStatusDetail
  };
}

async function getTranslations(): Promise<HeroTranslation[]> {
  try {
    return await getTranslationsFromSupabase();
  } catch {
    // Fall back to Prisma if Supabase is not configured or not ready.
  }

  try {
    const heroTranslation = await getHeroTranslationDelegate();
    if (!heroTranslation) return [];
    return await heroTranslation.findMany();
  } catch {
    return [];
  }
}

function applyTranslations(heroes: HeroMeta[], translations: HeroTranslation[]): HeroMeta[] {
  const map = new Map(translations.map((translation) => [translation.heroId, translation]));

  return heroes.map((hero) => {
    const translation = map.get(hero.heroId);
    if (!translation) return hero;

    return {
      ...hero,
      heroName: translation.nameKo || hero.heroName,
      role: translation.roleKo || hero.role
    };
  });
}

async function fetchHeroMetaFromApi(): Promise<HeroMeta[]> {
  const heroes = await fetchJson<RawHero[]>(`${API_BASE_URL}/heroes`);
  const statsResults = await Promise.all(
    heroes.map(async (hero) => {
      if (!hero.name) {
        console.warn("[hero-meta] Missing hero name from heroes list", { heroId: hero.id });
        return mapHeroWithoutStats(hero, "missing-name", "Hero list item did not include name.");
      }

      try {
        const stats = await fetchJson<RawHeroStats>(`${API_BASE_URL}/heroes/hero/${encodeURIComponent(hero.name)}/stats`);
        return mapHeroMeta(hero, stats);
      } catch (error) {
        const message = getErrorMessage(error);
        console.warn("[hero-meta] Hero stats API failed", { heroId: hero.id, heroName: hero.name, error: message });
        return mapHeroWithoutStats(hero, "api-failed", message);
      }
    })
  );

  return statsResults;
}

export async function getHeroMeta(): Promise<HeroMeta[]> {
  let heroes = MOCK_HERO_META;

  if (!useMockData()) {
    try {
      const apiHeroes = await fetchHeroMetaFromApi();
      heroes = apiHeroes.length > 0 ? apiHeroes : MOCK_HERO_META;
    } catch {
      heroes = MOCK_HERO_META;
    }
  }

  const translations = await getTranslations();
  return applyTranslations(heroes, translations);
}

export async function upsertHeroTranslation(input: HeroTranslationInput): Promise<void> {
  if (getSupabaseConfig()) {
    await upsertTranslationToSupabase(input);
    return;
  }

  const heroTranslation = await getHeroTranslationDelegate();
  if (!heroTranslation) {
    throw new Error("Supabase env vars or DATABASE_URL are required to save hero translations.");
  }

  await heroTranslation.upsert({
    where: { heroId: input.heroId },
    create: input,
    update: {
      nameKo: input.nameKo,
      roleKo: input.roleKo
    }
  });
}
