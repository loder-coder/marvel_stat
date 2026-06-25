import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getPlayerDetail, getPlayerProfile, refreshPlayer, searchPlayer } from "@/lib/playerService";
import { getCached } from "@/lib/cache";

const server = new McpServer({ name: "marvel-stat", version: "0.1.0" });
const response = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });
server.tool("search_player", "닉네임으로 플레이어를 검색합니다. Redis 캐시와 일일 API 예산을 적용합니다.", { nickname: z.string().min(1) }, async ({ nickname }) => response(await searchPlayer(nickname)));
server.tool("get_player_profile", "playerId 프로필을 반환합니다. stale 캐시를 허용합니다.", { playerId: z.string().min(1) }, async ({ playerId }) => response(await getPlayerProfile(playerId)));
server.tool("get_player_summary", "playerId 요약 통계를 반환합니다.", { playerId: z.string().min(1) }, async ({ playerId }) => { const detail = await getPlayerDetail(playerId); return response({ data: detail.data.summary, cache: detail.cache }); });
server.tool("get_player_matches", "최근 매치 히스토리를 반환합니다. 짧은 TTL을 적용합니다.", { playerId: z.string().min(1) }, async ({ playerId }) => { const detail = await getPlayerDetail(playerId); return response({ data: detail.data.matches, cache: detail.cache }); });
server.tool("refresh_player", "특정 플레이어만 수동으로 갱신합니다. Redis lock과 API 예산을 적용합니다.", { playerId: z.string().min(1) }, async ({ playerId }) => response(await refreshPlayer(playerId)));
server.tool("get_player_cache_status", "플레이어 분리 캐시 상태를 반환합니다.", { playerId: z.string().min(1) }, async ({ playerId }) => response({ profile: await getCached(`marvel:player:${playerId}:profile`), summary: await getCached(`marvel:player:${playerId}:summary`), heroes: await getCached(`marvel:player:${playerId}:heroes`), matches: await getCached(`marvel:player:${playerId}:matches`) }));
await server.connect(new StdioServerTransport());
