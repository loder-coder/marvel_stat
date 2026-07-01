export type HistoryPoint = {
  date: string;
  winRate: number;
  metaScore: number;
  metaTier: string;
  pickRate?: number;
  banRate?: number;
  matches?: number;
};

export type HistoryDelta = {
  winRate: number;
  metaScore: number;
  tierChanged: boolean;
  previousTier: string;
  latestTier: string;
  pickRate: number | null;
  banRate: number | null;
  matches: number | null;
};

const round = (value: number): number => Math.round(value * 100) / 100;

/** Compares the earliest and latest points without mutating the time series. */
export function calculateHistoryDelta(data: HistoryPoint[]): HistoryDelta | null {
  if (data.length < 2) return null;
  const first = data[0];
  const latest = data[data.length - 1];
  return {
    winRate: round(latest.winRate - first.winRate),
    metaScore: round(latest.metaScore - first.metaScore),
    tierChanged: first.metaTier !== latest.metaTier,
    previousTier: first.metaTier,
    latestTier: latest.metaTier
    ,
    pickRate: first.pickRate !== undefined && latest.pickRate !== undefined
      ? round(latest.pickRate - first.pickRate)
      : null,
    banRate: first.banRate !== undefined && latest.banRate !== undefined
      ? round(latest.banRate - first.banRate)
      : null,
    matches: first.matches !== undefined && latest.matches !== undefined
      ? latest.matches - first.matches
      : null
  };
}
