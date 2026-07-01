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
      sort: (sort as HeroSort | null) ?? undefined
    });
    return NextResponse.json({
      data,
      meta: {
        count: data.length,
        stale: result.stale,
        updatedAt: data[0]?.updatedAt ?? result.data[0]?.updatedAt ?? null
      }
    });
  } catch {
    return NextResponse.json({ error: "Official Hero Hot List is unavailable" }, { status: 502 });
  }
}
