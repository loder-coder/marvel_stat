import { NextResponse } from "next/server";
import { filterHeroes, getHeroes, isHeroTier, type HeroSort } from "@/lib/heroService";
import type { HeroMode, HeroTier } from "@/lib/officialHeroParser";

const SORTS = new Set<HeroSort>(["pickRate", "winRate", "hero"]);
const MODES = new Set<HeroMode>(["Quick", "Competitive"]);

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const tier = params.get("tier");
    const sort = params.get("sort");
    const mode = params.get("mode");

    if (tier && !isHeroTier(tier)) return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    if (sort && !SORTS.has(sort as HeroSort)) return NextResponse.json({ error: "Invalid sort" }, { status: 400 });
    if (mode && !MODES.has(mode as HeroMode)) return NextResponse.json({ error: "Invalid mode" }, { status: 400 });

    const result = await getHeroes();
    const data = filterHeroes(result.data, {
      platform: params.get("platform") ?? undefined,
      tier: (tier as HeroTier | null) ?? undefined,
      role: params.get("role") ?? undefined,
      mode: (mode as HeroMode | null) ?? undefined,
      season: params.get("season") ?? undefined,
      rankFilter: params.get("rankFilter") ?? undefined,
      metaTier: params.get("metaTier") ?? undefined,
      sort: (sort as HeroSort | null) ?? undefined
    });
    return NextResponse.json({
      data,
      meta: {
        count: data.length,
        stale: result.stale,
        source: result.source === "rivalsmeta" ? "RivalsMeta" : "Official Hero Hot List",
        sourceUrl: result.sourceUrl,
        season: result.season,
        rankFilter: params.get("rankFilter") ?? null,
        availableRankFilters: result.availableRankFilters,
        updatedAt: result.updatedAt,
        refreshPolicy: "daily_cron_manual_refresh",
        refreshPolicyLabel: "하루 1회 자동 갱신 · 필요 시 관리자 수동 갱신",
        attributionRequired: true
      }
    });
  } catch (error) {
    console.error("[hero-api] Unable to load cached hero metadata", error);
    return NextResponse.json({ error: "Hero metadata is unavailable" }, { status: 502 });
  }
}
