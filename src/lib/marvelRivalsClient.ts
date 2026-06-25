import { config } from "@/lib/config";
import type { PlayerDetail, PlayerProfile } from "@/lib/types";

class UpstreamError extends Error { constructor(message: string, readonly status?: number) { super(message); } }
const sample = (nickname: string): PlayerDetail => ({ profile: { playerId: `mock-${nickname}`, nickname, level: 42, rank: "Diamond III" }, summary: { playerId: `mock-${nickname}`, winRate: 53.7, matchesPlayed: 186, favoriteHero: "Luna Snow", kda: 2.84 }, heroes: [{ heroId: "luna-snow", heroName: "Luna Snow", matches: 61, winRate: 57.4, pickRate: 32.8, kda: 3.12 }, { heroId: "magneto", heroName: "Magneto", matches: 37, winRate: 51.4, pickRate: 19.9, kda: 2.35 }], matches: [{ matchId: "m1", playedAt: new Date().toISOString(), result: "WIN", heroName: "Luna Snow", kda: 3.4, map: "Yggsgard" }, { matchId: "m2", playedAt: new Date(Date.now()-3600000).toISOString(), result: "LOSS", heroName: "Magneto", kda: 1.8, map: "Tokyo 2099" }] });
async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${config.apiBaseUrl}${path}`, { headers: { "x-api-key": config.apiKey ?? "" }, signal: AbortSignal.timeout(8000), cache: "no-store" });
  if (!response.ok) throw new UpstreamError(`Marvel Rivals API failed (${response.status})`, response.status);
  return response.json() as Promise<T>;
}
// Endpoint shapes vary by API plan. Keep adaptation isolated here before enabling production mode.
export const marvelClient = {
  async searchPlayer(nickname: string): Promise<PlayerProfile> { if (config.useMock) return sample(nickname).profile; return request<PlayerProfile>(`/players/search?nickname=${encodeURIComponent(nickname)}`); },
  async getPlayer(playerId: string): Promise<PlayerDetail> { if (config.useMock) return sample(playerId.replace(/^mock-/, "")); return request<PlayerDetail>(`/players/${encodeURIComponent(playerId)}`); }
};
export { UpstreamError };
