# Marvel Stat MVP

Marvel Rivals 메타 통계와 온디맨드 플레이어 검색을 분리한 Next.js MVP입니다. API 키는 서버에서만 사용하며, `USE_MOCK_DATA=true`이면 외부 API 없이 화면과 MCP를 확인할 수 있습니다.

## 실행

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

브라우저에서 `/players`를 열어 `Luna`처럼 임의의 닉네임을 검색하세요. mock 모드에서는 항상 예시 데이터를 돌려줍니다. 실제 API endpoint/응답 구조는 API 플랜에 따라 다를 수 있으므로 [src/lib/marvelRivalsClient.ts](src/lib/marvelRivalsClient.ts)의 어댑터만 맞춰서 활성화합니다.

## 플레이어 갱신 정책

| 구간 | 동작 |
| --- | --- |
| 0–80% | fresh cache가 없으면 외부 API 호출 |
| 80–95% | TTL을 연장하고 stale cache 우선 반환 |
| 95% 이상 | 신규 외부 호출 차단, 존재하는 stale cache만 반환 |

키는 `marvel:player-search:{normalizedNickname}`, `marvel:player:{playerId}:profile|summary|heroes|matches|recent|cache-status`를 사용합니다. 각 값은 fresh 기간 뒤에도 stale 기간까지 유지되어 API 실패·429·예산 차단 시 페이지를 계속 표시할 수 있습니다. lock은 `marvel:lock:player-search:{normalizedNickname}` 및 `marvel:lock:player:{playerId}:refresh`이며 TTL과 `finally` 해제를 사용합니다.

일일 카운터는 `marvel:api-budget:{yyyy-mm-dd}:used`입니다. limit은 `MARVEL_RIVALS_DAILY_API_LIMIT`으로 설정하며 날짜는 Asia/Seoul 기준입니다.

## HTTP / MCP

- `GET /api/players/search?nickname=`
- `GET /api/players/:playerId`
- `POST /api/players/:playerId/refresh` (production에서는 `Authorization: Bearer ADMIN_REFRESH_TOKEN` 필요)
- `npm run mcp`: `search_player`, `get_player_profile`, `get_player_summary`, `get_player_matches`, `refresh_player`, `get_player_cache_status`

## 배치 작업

영웅/티어 작업만 `06:00 Asia/Seoul`에 `refreshMarvelStats`로 스케줄링합니다. **플레이어는 이 작업에 포함하지 않습니다.** 플랫폼 cron 혹은 node-cron에 해당 entry point를 연결하고, `marvel:refresh:lock`으로 중복 실행을 막으세요.

## 남은 TODO

- 실제 Marvel Rivals API의 플레이어 endpoint와 Zod 응답 검증 추가
- Redis를 운영 환경에서 필수로 설정하고 IP/user rate limit을 edge 또는 gateway에 연결
- Prisma를 통한 nickname/playerId 매핑과 스냅샷 저장 연결
- 영웅 메타 수집·tier calculator·06시 scheduler 구현
- 수동 refresh cooldown 및 사용자 인증/관리자 권한 강화
