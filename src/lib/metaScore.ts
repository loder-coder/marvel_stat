import type { RivalsMetaTier } from "@/lib/rivalsMetaParser";

export const TIER_BASE_SCORE: Record<RivalsMetaTier, number> = {
  S: 90,
  A: 75,
  B: 60,
  C: 45,
  D: 30
};

export type MetaScoreInput = {
  tier: RivalsMetaTier;
  winRate: number;
  pickRate?: number;
  banRate?: number;
  matches?: number;
};

const clamp = (value: number): number => Math.min(100, Math.max(0, value));

/** Calculates a stable 0-100 score. Optional metrics can be weighted here without UI changes. */
export function calculateMetaScore(input: MetaScoreInput): number {
  const winRateAdjustment = (input.winRate - 50) * 1.5;
  return Math.round(clamp(TIER_BASE_SCORE[input.tier] + winRateAdjustment) * 10) / 10;
}

export function tierFromMetaScore(score: number): RivalsMetaTier {
  if (score >= 82.5) return "S";
  if (score >= 67.5) return "A";
  if (score >= 52.5) return "B";
  if (score >= 37.5) return "C";
  return "D";
}
