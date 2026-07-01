import type { HeroMeta } from "@/lib/officialHeroParser";

export const MIN_PICK_RATE = 0.5;
export const META_SCORE_WEIGHTS = { winRate: 0.7, pickRate: 0.3 } as const;
export const META_TIER_PERCENTILES = {
  OP: 0.05,
  S: 0.2,
  A: 0.45,
  B: 0.7,
  C: 0.9,
  D: 1
} as const;

export type MetaTier = keyof typeof META_TIER_PERCENTILES;
export type RankedHero = Omit<HeroMeta, "metaTier"> & {
  metaScore: number;
  metaTier: MetaTier | null;
  metaRank: number | null;
};

/**
 * Scores and ranks heroes within one platform/mode/rank population.
 * Pick rate is normalized to the population maximum so it can be combined with win rate.
 */
export function rankHeroMeta(heroes: HeroMeta[]): RankedHero[] {
  if (heroes.some((hero) => hero.source === "rivalsmeta")) {
    const order: Record<NonNullable<HeroMeta["metaTier"]>, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 };
    const sorted = [...heroes].sort((a, b) =>
      order[a.metaTier ?? "D"] - order[b.metaTier ?? "D"] || b.winRate - a.winRate
    );
    const ranks = new Map(sorted.map((hero, index) => [hero.hero, index + 1]));
    return heroes.map((hero) => ({
      ...hero,
      metaScore: hero.metaScore ?? hero.winRate,
      metaTier: hero.metaTier ?? null,
      metaRank: ranks.get(hero.hero) ?? null
    }));
  }

  const maxPickRate = Math.max(...heroes.map((hero) => hero.pickRate), 1);
  const scored = heroes.map((hero) => ({
    ...hero,
    metaScore:
      hero.winRate * META_SCORE_WEIGHTS.winRate +
      (hero.pickRate / maxPickRate) * 100 * META_SCORE_WEIGHTS.pickRate
  }));
  const eligible = scored
    .filter((hero) => hero.pickRate > MIN_PICK_RATE)
    .sort((a, b) => b.metaScore - a.metaScore || b.pickRate - a.pickRate);
  const ranking = new Map(eligible.map((hero, index) => [hero.hero, index + 1]));

  return scored.map((hero) => {
    const rank = ranking.get(hero.hero) ?? null;
    if (rank === null) return { ...hero, metaTier: null, metaRank: null };
    const percentile = rank / eligible.length;
    const metaTier = (Object.entries(META_TIER_PERCENTILES).find(([, cutoff]) => percentile <= cutoff)?.[0] ?? "D") as MetaTier;
    return { ...hero, metaTier, metaRank: rank };
  });
}
