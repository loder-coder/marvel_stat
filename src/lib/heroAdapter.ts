import type { HeroMeta } from "@/lib/officialHeroParser";
import { calculateMetaScore } from "@/lib/metaScore";
import type { RivalsMetaCharacterStats, RivalsMetaHero } from "@/lib/rivalsMetaParser";

const HERO_ALIASES: Record<string, string> = {
  "Star-lord": "Star-Lord",
  "Spider-man": "Spider-Man",
  "Jeff The Land Shark": "Jeff the Land Shark"
};

export function canonicalizeHeroName(hero: string): string {
  return HERO_ALIASES[hero] ?? hero;
}

/** Merges rank-specific tier data with the public /characters default-scope statistics. */
export function mergeRivalsMetaHeroes(
  heroes: RivalsMetaHero[],
  characters: RivalsMetaCharacterStats[]
): RivalsMetaHero[] {
  const characterMap = new Map(characters.map((hero) => [canonicalizeHeroName(hero.hero), hero]));
  return heroes.map((hero) => {
    const canonicalHero = canonicalizeHeroName(hero.hero);
    const character = characterMap.get(canonicalHero);
    const pickRate = character?.pickRate ?? hero.pickRate;
    const banRate = character?.banRate ?? hero.banRate;
    const matches = character?.matches ?? hero.matches;
    return {
      ...hero,
      hero: canonicalHero,
      role: character?.role,
      pickRate,
      banRate,
      matches,
      metaScore: calculateMetaScore({ tier: hero.metaTier, winRate: hero.winRate, pickRate, banRate, matches }),
      charactersSourceUrl: character?.sourceUrl,
      charactersScope: character ? "global_or_default_characters_page" : undefined
    };
  });
}

/** Adapts RivalsMeta's current tier-list snapshot to the existing dashboard model. */
export function adaptRivalsMetaHeroes(heroes: RivalsMetaHero[]): HeroMeta[] {
  return heroes.map((hero) => ({
    platform: hero.platform,
    mode: "Competitive",
    tier: "Overall",
    role: hero.role ?? "",
    hero: canonicalizeHeroName(hero.hero),
    pickRate: hero.pickRate ?? 0,
    winRate: hero.winRate,
    updatedAt: hero.updatedAt,
    source: hero.source,
    sourceUrl: hero.sourceUrl,
    season: hero.season,
    rankFilter: hero.rankFilter,
    metaTier: hero.metaTier,
    metaScore: hero.metaScore,
    banRate: hero.banRate,
    matches: hero.matches,
    charactersSourceUrl: hero.charactersSourceUrl,
    charactersScope: hero.charactersScope
  }));
}
