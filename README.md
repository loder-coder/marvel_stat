# Hero Meta

RivalsMeta 공개 티어표를 현재 시즌의 전체 랭크 필터로 재가공해 보여주는 Next.js 15 기반 Marvel Rivals 메타 대시보드입니다.

## 데이터 및 출처 정책

- 주 데이터 출처: [RivalsMeta Tier List](https://rivalsmeta.com/tier-list)
- 현재 시즌의 All Ranks부터 One Above All까지 공개 HTML에 포함된 통계를 수집합니다.
- 공개 HTML 한 번으로 모든 랭크를 계산하므로 갱신당 RivalsMeta 요청은 1회입니다.
- Vercel Hobby 플랜에 맞춰 UTC 00:00(KST 09:00)에 하루 1회 자동 갱신하며, 일반 사용자 조회는 RivalsMeta에 요청하지 않습니다.
- 자동 갱신 외에도 필요할 때 관리자가 수동 갱신할 수 있습니다.
- 영웅명, 티어와 수치 데이터만 사용하며 이미지, 설명문, 레이아웃은 복제하지 않습니다.
- 일부 랭크 파싱 실패는 `partialErrors`로 기록하고 성공한 랭크는 유지합니다.
- 본 프로젝트는 RivalsMeta, Marvel, NetEase Games와 공식적으로 관련이 없습니다.

## 캐시 흐름

```text
일반 조회:
Redis current → Redis last-success(stale) → memory cache → official fallback

관리자/cron 갱신:
Redis 분산 lock → RivalsMeta 공개 HTML 1회 → 파싱/검증 → Redis + memory cache
```

Redis 장애 시 메모리 캐시를 사용합니다. Redis와 메모리 캐시가 모두 없을 때만 기존 공식 Hero Hot List fallback을 사용합니다.

Redis 키:

- `rivalsmeta:tier-list:current`
- `rivalsmeta:tier-list:last-success`
- `rivalsmeta:tier-list:last-refresh-at`
- `rivalsmeta:tier-list:refresh-lock`

## 환경변수

```env
RIVALSMETA_BASE_URL=https://rivalsmeta.com
RIVALSMETA_REFRESH_INTERVAL_HOURS=24
RIVALSMETA_MIN_REQUEST_DELAY_MS=2000
REDIS_URL=redis://...
ADMIN_SECRET=충분히-긴-관리자-토큰
CRON_SECRET=별도의-충분히-긴-cron-토큰
```

기존 `MARVEL_RIVALS_*`, Supabase, player 관련 환경변수는 배포 호환성을 위한 deprecated legacy fallback으로 유지할 수 있지만 RivalsMeta 갱신에는 사용하지 않습니다.

## 개발 실행

```bash
npm install
npm run dev
```

Redis가 없는 로컬 환경에서도 메모리 캐시와 공식 fallback으로 실행됩니다.

## API

```text
GET /api/heroes?rankFilter=Diamond%2B&metaTier=S
GET /api/heroes?rankFilter=All%20Ranks&metaTier=S
```

응답 `meta`:

- `source`, `sourceUrl`
- `season`, `rankFilter`, `availableRankFilters`
- `stale`, `updatedAt`
- `refreshPolicy: "daily_cron_manual_refresh"`
- `refreshPolicyLabel: "하루 1회 자동 갱신 · 필요 시 관리자 수동 갱신"`
- `attributionRequired: true`

## 관리자 수동 갱신

Authorization 헤더 사용을 권장합니다.

```bash
curl -X POST http://localhost:3000/api/admin/refresh-meta \
  -H "Authorization: Bearer $ADMIN_SECRET"
```

쿼리 토큰도 지원하지만 URL이 로그에 남을 수 있습니다.

```text
POST /api/admin/refresh-meta?token=ADMIN_SECRET
```

`ADMIN_SECRET`와 `CRON_SECRET`이 모두 미설정이면 500, 인증 실패는 401, 이미 갱신 중이면 409를 반환합니다. 관리자 POST 라우트는 두 Secret의 Bearer 인증을 모두 허용합니다.

## Cron 예시

Vercel Cron은 경로를 GET으로 호출하므로 POST 전용 관리자 라우트와 별도의 `/api/cron/refresh-meta`를 사용합니다. Production 환경에 `CRON_SECRET`을 설정하면 Vercel이 자동으로 `Authorization: Bearer ${CRON_SECRET}` 헤더를 전송합니다.

```json
{
  "crons": [
    {
      "path": "/api/cron/refresh-meta",
      "schedule": "0 0 * * *"
    }
  ]
}
```

Cron은 Production deployment에서만 실행됩니다. 이 프로젝트는 Vercel Hobby 플랜 제한에 맞춰 하루 1회 실행하며, `0 0 * * *`는 UTC 00:00 / KST 09:00입니다.

## 배포 검증

```bash
# 401 예상
curl -i -X POST https://YOUR_DOMAIN.com/api/admin/refresh-meta

# 수동 관리자 갱신
curl -X POST https://YOUR_DOMAIN.com/api/admin/refresh-meta \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET"

# Cron Secret 인증 확인
curl https://YOUR_DOMAIN.com/api/cron/refresh-meta \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# 일반 캐시 API
curl "https://YOUR_DOMAIN.com/api/heroes?rankFilter=Diamond%2B&metaTier=S"
```

확인 항목:

- 갱신 응답의 `ok: true`, `count > 0`, `partialErrors` 배열
- 일반 API의 `meta.source`, `availableRankFilters`, `refreshPolicy`
- 갱신 직후 일반 API 로그에 RivalsMeta fetch 메시지가 다시 발생하지 않는지
- Redis의 current, last-success, last-refresh-at 키가 생성됐는지

## Meta Score

```text
S=90, A=75, B=60, C=45, D=30
winRateAdjustment = (winRate - 50) × 1.5
metaScore = clamp(tierBaseScore + winRateAdjustment, 0, 100)
```

결과는 소수점 첫째 자리로 반올림합니다. 향후 pickRate, banRate, matches 가중치는 UI 변경 없이 계산 함수에서 확장할 수 있습니다.
