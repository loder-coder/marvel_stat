import * as cheerio from "cheerio";
import { unflatten } from "devalue";
import { z } from "zod";
import { calculateMetaScore, tierFromMetaScore } from "@/lib/metaScore";

export const RIVALSMETA_TIERS = ["S", "A", "B", "C", "D"] as const;
export type RivalsMetaTier = (typeof RIVALSMETA_TIERS)[number];

export const RANK_FILTER_DEFINITIONS = [
  { name: "All Ranks", ranks: ["1", "2", "3", "4", "5", "6", "7", "8", "9"] },
  { name: "Bronze", ranks: ["1"] },
  { name: "Silver", ranks: ["2"] },
  { name: "Gold", ranks: ["3"] },
  { name: "Platinum", ranks: ["4"] },
  { name: "Diamond", ranks: ["5"] },
  { name: "Diamond+", ranks: ["5", "6", "7", "8", "9"] },
  { name: "Grandmaster", ranks: ["6"] },
  { name: "Grandmaster+", ranks: ["6", "7", "8", "9"] },
  { name: "Celestial", ranks: ["9"] },
  { name: "Celestial+", ranks: ["7", "8", "9"] },
  { name: "Eternity", ranks: ["7"] },
  { name: "Eternity+", ranks: ["7", "8"] },
  { name: "One Above All", ranks: ["8"] }
] as const;

export interface RivalsMetaHero {
  source: "rivalsmeta";
  platform: "PC";
  hero: string;
  metaTier: RivalsMetaTier;
  winRate: number;
  pickRate?: number;
  banRate?: number;
  matches?: number;
  metaScore: number;
  season: string;
  rankFilter: string;
  updatedAt: Date;
  sourceUrl: string;
  role?: string;
  charactersSourceUrl?: string;
  charactersScope?: string;
}

export interface RivalsMetaCharacterStats {
  source: "rivalsmeta";
  hero: string;
  role?: string;
  tier?: RivalsMetaTier;
  winRate?: number;
  pickRate?: number;
  banRate?: number;
  matches?: number;
  season?: string;
  rankFilter?: string;
  sourceUrl: string;
}

export type RivalsMetaPartialError = { rankFilter: string; message: string };
export type RivalsMetaDataset = {
  source: "rivalsmeta";
  season: string;
  rankFilters: string[];
  updatedAt: Date;
  sourceUrl: string;
  heroes: RivalsMetaHero[];
  errors: RivalsMetaPartialError[];
};

const StatSchema = z.object({
  hero_id: z.coerce.number().int().positive().optional().catch(undefined),
  matches: z.coerce.number().nonnegative().default(0),
  wins: z.coerce.number().nonnegative().default(0),
  wr_matches: z.coerce.number().nonnegative().default(0),
  wr_wins: z.coerce.number().nonnegative().default(0)
});
const BanSchema = z.object({
  hero_id: z.coerce.number().int().positive().optional().catch(undefined),
  bans: z.coerce.number().nonnegative().default(0)
});
const PayloadSchema = z.object({
  season: z.union([z.string(), z.number()]),
  timestamp: z.number().optional(),
  heroes: z.array(z.object({ rank: z.coerce.string(), heroes: z.array(StatSchema) })),
  bans: z.array(z.object({ rank: z.coerce.string(), bans: z.array(BanSchema) })).default([])
});
const HeroSchema = z.object({
  source: z.literal("rivalsmeta"),
  platform: z.literal("PC"),
  hero: z.string().trim().min(1),
  metaTier: z.enum(RIVALSMETA_TIERS),
  winRate: z.number().finite().min(0).max(100),
  pickRate: z.number().finite().min(0).optional(),
  banRate: z.number().finite().min(0).optional(),
  matches: z.number().finite().nonnegative().optional(),
  metaScore: z.number().finite().min(0).max(100),
  season: z.string().trim().min(1),
  rankFilter: z.string().trim().min(1),
  updatedAt: z.date(),
  sourceUrl: z.string().url()
});
const CharacterStatsSchema = z.object({
  source: z.literal("rivalsmeta"),
  hero: z.string().trim().min(1),
  role: z.string().optional(),
  tier: z.enum(RIVALSMETA_TIERS).optional(),
  winRate: z.number().finite().min(0).max(100).optional(),
  pickRate: z.number().finite().min(0).optional(),
  banRate: z.number().finite().min(0).optional(),
  matches: z.number().int().nonnegative().optional(),
  season: z.string().optional(),
  rankFilter: z.string().optional(),
  sourceUrl: z.string().url()
});

export type RivalsMetaParseOptions = { sourceUrl: string; updatedAt: Date };
type AggregatedStat = Omit<z.infer<typeof StatSchema>, "hero_id"> & { hero_id: number };

function extractPayload($: cheerio.CheerioAPI): z.infer<typeof PayloadSchema> {
  const serialized = $("#__NUXT_DATA__").text().trim();
  if (!serialized) throw new Error("RivalsMeta HTML does not contain public Nuxt data");
  let decoded: unknown;
  try {
    decoded = unflatten(JSON.parse(serialized) as unknown[], {
      ShallowReactive: (value: unknown) => value,
      ShallowRef: (value: unknown) => value,
      Reactive: (value: unknown) => value
    });
  } catch (error) {
    throw new Error(`Unable to decode RivalsMeta public HTML data: ${error instanceof Error ? error.message : String(error)}`);
  }
  const root = z.object({ data: z.record(z.string(), z.unknown()) }).safeParse(decoded);
  if (!root.success) throw new Error("RivalsMeta public HTML data has an invalid root structure");
  for (const candidate of Object.values(root.data.data)) {
    const parsed = PayloadSchema.safeParse(candidate);
    if (parsed.success) return parsed.data;
  }
  throw new Error("RivalsMeta public HTML does not contain a valid hero statistics payload");
}

function extractHeroCatalog($: cheerio.CheerioAPI): Map<number, { hero: string; tier: RivalsMetaTier }> {
  const catalog = new Map<number, { hero: string; tier: RivalsMetaTier }>();
  $(".tier-list .tier").each((_, tierElement) => {
    const tierText = $(tierElement).find(".t-name").first().text().trim().toUpperCase();
    if (!RIVALSMETA_TIERS.includes(tierText as RivalsMetaTier)) return;
    $(tierElement).find(".cha").each((__, heroElement) => {
      const element = $(heroElement);
      const hero = element.find(".name").first().text().trim() || element.find("img[alt]").first().attr("alt")?.trim() || "";
      const image = element.find('img[src*="img_selecthero_"]').first().attr("src") ?? "";
      const id = image.match(/img_selecthero_(\d+)001\.png/)?.[1];
      if (hero && id) catalog.set(Number(id), { hero, tier: tierText as RivalsMetaTier });
    });
  });
  if (catalog.size === 0) throw new Error("RivalsMeta HTML contains no hero name catalog");
  return catalog;
}

function aggregateStats(
  groups: z.infer<typeof PayloadSchema>["heroes"],
  ranks: readonly string[]
): AggregatedStat[] {
  const values = new Map<number, AggregatedStat>();
  for (const group of groups.filter((item) => ranks.includes(item.rank))) {
    for (const stat of group.heroes) {
      if (!stat.hero_id) continue;
      const current = values.get(stat.hero_id) ?? { hero_id: stat.hero_id, matches: 0, wins: 0, wr_matches: 0, wr_wins: 0 };
      values.set(stat.hero_id, {
        hero_id: stat.hero_id,
        matches: current.matches + stat.matches,
        wins: current.wins + stat.wins,
        wr_matches: current.wr_matches + stat.wr_matches,
        wr_wins: current.wr_wins + stat.wr_wins
      });
    }
  }
  return [...values.values()];
}

function aggregateBans(groups: z.infer<typeof PayloadSchema>["bans"], ranks: readonly string[]): Map<number, number> {
  const values = new Map<number, number>();
  for (const group of groups.filter((item) => ranks.includes(item.rank))) {
    for (const stat of group.bans) {
      if (!stat.hero_id) continue;
      values.set(stat.hero_id, (values.get(stat.hero_id) ?? 0) + stat.bans);
    }
  }
  return values;
}

/** Parses all current-season rank filters from one public, server-rendered HTML document. */
export function parseRivalsMetaTierList(html: string, options: RivalsMetaParseOptions): RivalsMetaDataset {
  if (Number.isNaN(options.updatedAt.getTime())) throw new Error("Invalid RivalsMeta fetch time");
  const $ = cheerio.load(html);
  const payload = extractPayload($);
  const catalog = extractHeroCatalog($);
  const season = $("select option[selected]").first().text().trim() || `Season ${payload.season}`;
  const heroes: RivalsMetaHero[] = [];
  const errors: RivalsMetaPartialError[] = [];
  const successfulRanks: string[] = [];

  for (const definition of RANK_FILTER_DEFINITIONS) {
    try {
      const stats = aggregateStats(payload.heroes, definition.ranks);
      if (stats.length === 0) throw new Error("hero statistics are empty");
      const bans = aggregateBans(payload.bans, definition.ranks);
      const matchBase = stats.reduce((sum, stat) => sum + stat.matches, 0) / 6;
      const banBase = [...bans.values()].reduce((sum, value) => sum + value, 0) / 2;
      let added = 0;

      for (const stat of stats) {
        const identity = catalog.get(stat.hero_id);
        if (!identity) continue;
        const winRate = stat.wr_matches > 0 ? stat.wr_wins / stat.wr_matches * 100 : 0;
        const pickRate = matchBase > 0 ? stat.matches / matchBase * 100 : 0;
        const banRate = banBase > 0 ? (bans.get(stat.hero_id) ?? 0) / banBase * 100 : 0;
        const preliminaryScore = calculateMetaScore({ tier: identity.tier, winRate, pickRate, banRate, matches: stat.matches });
        const metaTier = tierFromMetaScore(preliminaryScore);
        const parsed = HeroSchema.safeParse({
          source: "rivalsmeta",
          platform: "PC",
          hero: identity.hero,
          metaTier,
          winRate,
          pickRate,
          banRate,
          matches: stat.matches,
          metaScore: calculateMetaScore({ tier: metaTier, winRate, pickRate, banRate, matches: stat.matches }),
          season,
          rankFilter: definition.name,
          updatedAt: options.updatedAt,
          sourceUrl: options.sourceUrl
        });
        if (!parsed.success) throw new Error(`invalid ${identity.hero} data: ${parsed.error.issues[0]?.message}`);
        heroes.push(parsed.data);
        added += 1;
      }
      if (added === 0) throw new Error("no statistics matched the public hero catalog");
      successfulRanks.push(definition.name);
    } catch (error) {
      errors.push({ rankFilter: definition.name, message: error instanceof Error ? error.message : String(error) });
    }
  }

  if (heroes.length === 0) throw new Error("RivalsMeta current-season data contained no valid rank results");
  return { source: "rivalsmeta", season, rankFilters: successfulRanks, updatedAt: options.updatedAt, sourceUrl: options.sourceUrl, heroes, errors };
}

function parseOptionalNumber(value: string, kind: "percent" | "integer"): number | undefined {
  const normalized = value.trim().replaceAll(",", "").replace("%", "");
  if (!normalized || normalized === "—" || normalized === "-") return undefined;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return undefined;
  return kind === "integer" ? Math.trunc(parsed) : parsed;
}

function roleFromSource(value: string): string | undefined {
  const match = value.match(/\/(vanguard|duelist|strategist)\.png/i)?.[1]?.toLowerCase();
  if (!match) return undefined;
  return match[0].toUpperCase() + match.slice(1);
}

/** Parses the currently rendered public /characters statistics table. */
export function parseRivalsMetaCharacters(
  html: string,
  options: { sourceUrl: string }
): RivalsMetaCharacterStats[] {
  const $ = cheerio.load(html);
  const season = $("select option[selected]").last().text().trim() || undefined;
  const rankFilter = $(".rank-name").first().text().trim() || "All Ranks";
  const characters: RivalsMetaCharacterStats[] = [];

  $("table tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 7) return;
    const hero = cells.eq(0).find(".name").first().text().trim() ||
      cells.eq(0).find("img[alt]").first().attr("alt")?.trim() || "";
    if (!hero) return;
    const tierText = cells.eq(2).find(".tier").first().text().trim().toUpperCase();
    const candidate = {
      source: "rivalsmeta" as const,
      hero,
      role: roleFromSource(cells.eq(1).find("img.hero-class").attr("src") ?? ""),
      tier: RIVALSMETA_TIERS.includes(tierText as RivalsMetaTier) ? tierText as RivalsMetaTier : undefined,
      winRate: parseOptionalNumber(cells.eq(3).text(), "percent"),
      pickRate: parseOptionalNumber(cells.eq(4).text(), "percent"),
      banRate: parseOptionalNumber(cells.eq(5).text(), "percent"),
      matches: parseOptionalNumber(cells.eq(6).text(), "integer"),
      season,
      rankFilter,
      sourceUrl: options.sourceUrl
    };
    const parsed = CharacterStatsSchema.safeParse(candidate);
    if (!parsed.success) throw new Error(`Invalid RivalsMeta /characters row for ${hero}: ${parsed.error.issues[0]?.message}`);
    characters.push(parsed.data);
  });

  if (characters.length === 0) throw new Error("RivalsMeta /characters contained no valid hero statistics");
  return characters;
}
