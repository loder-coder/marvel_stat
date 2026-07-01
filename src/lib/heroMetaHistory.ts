import "server-only";

import { z } from "zod";
import type { HeroMeta } from "@/lib/officialHeroParser";
import { calculateHistoryDelta, type HistoryPoint } from "@/lib/historyDelta";
import { getSupabaseAdminConfig, supabaseAdminRequest } from "@/lib/supabaseAdmin";

const TABLE = "hero_meta_snapshots";
const UPSERT_CHUNK_SIZE = 250;

export type HistorySaveResult =
  | { enabled: false; reason: string }
  | { enabled: true; saved: number; inserted: number; updated: number; snapshotDate: string; warning?: string };

export type SaveHeroMetaSnapshotsInput = {
  heroes: HeroMeta[];
  season: string;
  source: "rivalsmeta" | "official";
  sourceUrl: string;
  capturedAt: Date;
};

const ExistingRowSchema = z.array(z.object({ rank_filter: z.string(), hero: z.string() }));
const HistoryRowSchema = z.array(z.object({
  snapshot_date: z.string(),
  win_rate: z.coerce.number(),
  meta_score: z.coerce.number(),
  meta_tier: z.string(),
  season: z.string(),
  pick_rate: z.coerce.number().nullable().optional(),
  ban_rate: z.coerce.number().nullable().optional(),
  matches: z.coerce.number().int().nullable().optional()
}));

function filterValue(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

export async function saveHeroMetaSnapshots(input: SaveHeroMetaSnapshotsInput): Promise<HistorySaveResult> {
  if (!getSupabaseAdminConfig()) {
    const reason = "SUPABASE_SERVICE_ROLE_KEY is not configured";
    console.warn(`[hero-history] ${reason}; history persistence skipped`);
    return { enabled: false, reason };
  }

  const snapshotDate = input.capturedAt.toISOString().slice(0, 10);
  const eligible = input.heroes.filter((hero) => hero.rankFilter && hero.metaTier && hero.metaScore !== undefined);
  if (eligible.length === 0) {
    return { enabled: true, saved: 0, inserted: 0, updated: 0, snapshotDate, warning: "No eligible RivalsMeta heroes" };
  }

  let existing = new Set<string>();
  let lookupWarning: string | undefined;
  try {
    const query = new URLSearchParams({
      select: "rank_filter,hero",
      source: `eq.${input.source}`,
      snapshot_date: `eq.${snapshotDate}`,
      season: `eq.${filterValue(input.season)}`
    });
    const rows = ExistingRowSchema.parse(await supabaseAdminRequest<unknown>(`${TABLE}?${query}`));
    existing = new Set(rows.map((row) => `${row.rank_filter}\u0000${row.hero}`));
  } catch (error) {
    lookupWarning = error instanceof Error ? error.message : String(error);
    console.warn("[hero-history] Existing snapshot lookup failed; upsert will continue", error);
  }

  const records = eligible.map((hero) => ({
    source: input.source,
    snapshot_date: snapshotDate,
    captured_at: input.capturedAt.toISOString(),
    season: input.season,
    rank_filter: hero.rankFilter,
    hero: hero.hero,
    meta_tier: hero.metaTier,
    win_rate: hero.winRate,
    meta_score: hero.metaScore,
    pick_rate: hero.pickRate,
    ban_rate: hero.banRate ?? null,
    matches: hero.matches ?? null,
    role: hero.role || null,
    characters_source_url: hero.charactersSourceUrl ?? null,
    characters_scope: hero.charactersScope ?? null,
    source_url: input.sourceUrl,
    raw: {
      merged: hero,
      tierListSourceUrl: input.sourceUrl,
      charactersSourceUrl: hero.charactersSourceUrl ?? null,
      charactersScope: hero.charactersScope ?? null
    }
  }));

  let saved = 0;
  try {
    for (let index = 0; index < records.length; index += UPSERT_CHUNK_SIZE) {
      const chunk = records.slice(index, index + UPSERT_CHUNK_SIZE);
      const query = new URLSearchParams({ on_conflict: "source,snapshot_date,season,rank_filter,hero" });
      await supabaseAdminRequest<void>(`${TABLE}?${query}`, {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(chunk)
      });
      saved += chunk.length;
    }
  } catch (error) {
    const warning = error instanceof Error ? error.message : String(error);
    console.warn("[hero-history] Snapshot upsert partially failed", error);
    const updated = records.slice(0, saved).filter((row) => existing.has(`${row.rank_filter}\u0000${row.hero}`)).length;
    return { enabled: true, saved, inserted: saved - updated, updated, snapshotDate, warning };
  }

  const updated = records.filter((row) => existing.has(`${row.rank_filter}\u0000${row.hero}`)).length;
  return { enabled: true, saved, inserted: saved - updated, updated, snapshotDate, warning: lookupWarning };
}

export type HeroHistoryResult = {
  hero: string;
  rankFilter: string;
  season: string;
  data: HistoryPoint[];
  delta: ReturnType<typeof calculateHistoryDelta>;
};

export async function getHeroMetaHistory(args: {
  hero: string;
  rankFilter: string;
  season?: string;
  days: number;
}): Promise<HeroHistoryResult> {
  if (!getSupabaseAdminConfig()) {
    return { hero: args.hero, rankFilter: args.rankFilter, season: args.season ?? "", data: [], delta: null };
  }

  let season = args.season;
  if (!season) {
    const latestQuery = new URLSearchParams({
      select: "season",
      source: "eq.rivalsmeta",
      hero: `eq.${filterValue(args.hero)}`,
      rank_filter: `eq.${filterValue(args.rankFilter)}`,
      order: "captured_at.desc",
      limit: "1"
    });
    const latest = z.array(z.object({ season: z.string() })).parse(
      await supabaseAdminRequest<unknown>(`${TABLE}?${latestQuery}`)
    );
    season = latest[0]?.season ?? "";
  }
  if (!season) return { hero: args.hero, rankFilter: args.rankFilter, season: "", data: [], delta: null };

  const from = new Date();
  from.setUTCDate(from.getUTCDate() - args.days + 1);
  const query = new URLSearchParams({
    select: "snapshot_date,win_rate,meta_score,meta_tier,season,pick_rate,ban_rate,matches",
    source: "eq.rivalsmeta",
    hero: `eq.${filterValue(args.hero)}`,
    rank_filter: `eq.${filterValue(args.rankFilter)}`,
    season: `eq.${filterValue(season)}`,
    snapshot_date: `gte.${from.toISOString().slice(0, 10)}`,
    order: "snapshot_date.asc"
  });
  const rows = HistoryRowSchema.parse(await supabaseAdminRequest<unknown>(`${TABLE}?${query}`));
  const data = rows.map((row) => ({
    date: row.snapshot_date,
    winRate: row.win_rate,
    metaScore: row.meta_score,
    metaTier: row.meta_tier,
    pickRate: row.pick_rate ?? undefined,
    banRate: row.ban_rate ?? undefined,
    matches: row.matches ?? undefined
  }));
  return { hero: args.hero, rankFilter: args.rankFilter, season, data, delta: calculateHistoryDelta(data) };
}
