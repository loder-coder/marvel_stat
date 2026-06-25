export const config = {
  apiBaseUrl: process.env.MARVEL_RIVALS_API_BASE_URL ?? "https://marvelrivalsapi.com/api/v1",
  apiKey: process.env.MARVEL_RIVALS_API_KEY,
  useMock: process.env.USE_MOCK_DATA === "true" || !process.env.MARVEL_RIVALS_API_KEY,
  dailyLimit: Number(process.env.MARVEL_RIVALS_DAILY_API_LIMIT ?? 20000),
  softRatio: Number(process.env.PLAYER_SEARCH_SOFT_LIMIT_RATIO ?? 0.8),
  hardRatio: Number(process.env.PLAYER_SEARCH_HARD_LIMIT_RATIO ?? 0.95),
  cooldownSeconds: Number(process.env.PLAYER_REFRESH_COOLDOWN_SECONDS ?? 60)
};
