# Hero Meta

RivalsMeta 공개 티어표를 현재 시즌의 전체 랭크 필터로 재가공해 보여주는 Next.js 15 기반 Marvel Rivals 메타 대시보드입니다.

## 데이터 및 출처 정책

- 주 데이터 출처: [RivalsMeta Tier List](https://rivalsmeta.com/tier-list)
- 랭크별 티어와 승률: RivalsMeta 공개 `/tier-list`
- 역할, 픽률, 밴률, 매치 수: RivalsMeta 공개 `/characters`
- 두 페이지의 기본 필터 범위가 다를 수 있으므로 API의 `charactersScope`로 이를 명시합니다.
- 현재 시즌의 All Ranks부터 One Above All까지 공개 HTML에 포함된 통계를 수집합니다.
- 갱신당 `/tier-list`, `/characters`를 각각 한 번씩 요청하며 RivalsMeta 요청은 총 2회입니다.
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
Redis 분산 lock → RivalsMeta 공개 HTML 2회 → 파싱/병합/검증 → Redis + memory cache
```

Redis 장애 시 메모리 캐시를 사용합니다. Redis lock 또는 write 실패는 RivalsMeta 갱신 결과 자체를 실패시키지 않습니다. Redis와 메모리 캐시가 모두 없을 때만 기존 공식 Hero Hot List fallback을 사용합니다.

Vercel 같은 서버리스 환경에서는 TCP 연결이 필요 없는 Upstash REST 방식을 권장합니다. `UPSTASH_REDIS_REST_URL`과 `UPSTASH_REDIS_REST_TOKEN`이 모두 있으면 REST 클라이언트를 우선 사용합니다. 두 값이 없을 때만 `REDIS_URL` 기반 ioredis를 fallback으로 사용합니다.

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
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# TCP fallback only
REDIS_URL=rediss://...
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

`REDIS_URL=https://...` 형식은 ioredis TCP URL이 아니므로 사용할 수 없습니다. 이 경우 Redis unavailable로 처리되고 메모리 캐시로 fallback합니다. TCP fallback은 `redis://` 또는 TLS가 적용된 `rediss://`를 사용하세요.

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

## 히스토리 저장

Redis는 최신 데이터 캐시용이고, Supabase는 과거 스냅샷 저장용입니다. 매일 1회 Cron 갱신과 관리자 수동 갱신이 성공하면 같은 refresh 결과를 `hero_meta_snapshots`에 upsert합니다.

같은 `source + snapshot_date + season + rank_filter + hero` 조합은 새 행을 만들지 않고 업데이트합니다. 히스토리 저장 실패는 Redis 최신 데이터 갱신을 실패시키지 않으며 refresh 응답의 `history.warning`으로 확인할 수 있습니다.

```sql
create extension if not exists pgcrypto;

create table if not exists public.hero_meta_snapshots (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'rivalsmeta',
  snapshot_date date not null,
  captured_at timestamptz not null default now(),
  season text not null,
  rank_filter text not null,
  hero text not null,
  meta_tier text not null,
  win_rate numeric(5,2) not null,
  meta_score numeric(5,2) not null,
  pick_rate numeric(5,2),
  ban_rate numeric(5,2),
  matches integer,
  role text,
  characters_source_url text,
  characters_scope text,
  source_url text not null,
  raw jsonb,
  created_at timestamptz not null default now(),
  unique (source, snapshot_date, season, rank_filter, hero)
);

create index if not exists idx_hero_meta_snapshots_hero
on public.hero_meta_snapshots (hero);

create index if not exists idx_hero_meta_snapshots_rank_hero_date
on public.hero_meta_snapshots (rank_filter, hero, snapshot_date);

create index if not exists idx_hero_meta_snapshots_season_rank_date
on public.hero_meta_snapshots (season, rank_filter, snapshot_date);

alter table public.hero_meta_snapshots enable row level security;

alter table public.hero_meta_snapshots
add column if not exists pick_rate numeric(5,2),
add column if not exists ban_rate numeric(5,2),
add column if not exists matches integer,
add column if not exists role text,
add column if not exists characters_source_url text,
add column if not exists characters_scope text;
```

동일한 SQL은 [Supabase migration](supabase/migrations/20260702000000_create_hero_meta_snapshots.sql)에 있습니다. 기존 테이블이 이미 배포된 환경은 후속 migration `20260702010000_add_character_stats_to_hero_meta_snapshots.sql`을 적용합니다. `SUPABASE_SERVICE_ROLE_KEY`는 서버에서만 사용되며 브라우저에 전달되지 않습니다.

## 히스토리 API

```text
GET /api/heroes/history?hero=Peni%20Parker&rankFilter=Diamond%2B&days=30
```

- `hero`: 필수 canonical 영문명
- `rankFilter`: 기본 `Diamond+`
- `season`: 생략하면 저장된 최신 시즌
- `days`: 기본 30, 최소 1, 최대 180

Drawer의 승률 변화 그래프는 이 API를 영웅 선택 시 한 번 호출합니다. 날짜가 2개 이상 쌓여야 추세선을 표시하며, 그 전에는 데이터 부족 안내가 표시됩니다.

Supabase 스냅샷에는 승률과 메타 점수뿐 아니라 `/characters`에서 병합한 픽률, 밴률, 매치 수, 역할, source scope도 함께 저장됩니다.

## Meta Score

```text
S=90, A=75, B=60, C=45, D=30
winRateAdjustment = (winRate - 50) × 1.5
metaScore = clamp(tierBaseScore + winRateAdjustment, 0, 100)
```

결과는 소수점 첫째 자리로 반올림합니다. 향후 pickRate, banRate, matches 가중치는 UI 변경 없이 계산 함수에서 확장할 수 있습니다.
