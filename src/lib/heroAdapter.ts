import type { HeroMeta } from "@/lib/officialHeroParser";
import type { RivalsMetaHero } from "@/lib/rivalsMetaParser";

const HERO_ALIASES: Record<string, string> = {
  "Star-lord": "Star-Lord",
  "Spider-man": "Spider-Man",
  "Jeff The Land Shark": "Jeff the Land Shark"
};

/** Adapts RivalsMeta's current tier-list snapshot to the existing dashboard model. */
export function adaptRivalsMetaHeroes(heroes: RivalsMetaHero[]): HeroMeta[] {
  return heroes.map((hero) => ({
    platform: hero.platform,
    mode: "Competitive",
    tier: "Overall",
    role: "",
    hero: HERO_ALIASES[hero.hero] ?? hero.hero,
    pickRate: hero.pickRate ?? 0,
    winRate: hero.winRate,
    updatedAt: hero.updatedAt,
    source: hero.source,
    sourceUrl: hero.sourceUrl,
    season: hero.season,
    rankFilter: hero.rankFilter,
    metaTier: hero.metaTier
    ,
    metaScore: hero.metaScore,
    banRate: hero.banRate,
    matches: hero.matches
  }));
}
