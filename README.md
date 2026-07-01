# Hero Meta

Marvel Rivals 공식 [Hero Hot List](https://www.marvelrivals.com/heroes_data/index.html)의 PC 데이터를 보여주는 Next.js Dashboard입니다.

## 실행

```bash
npm install
npm run dev
```

환경변수나 API 키는 필요하지 않습니다. 서버는 공식 TSV 데이터를 30분 동안 메모리에 캐시하며, 갱신 실패 시 마지막 성공 데이터를 제공합니다.

## API

`GET /api/heroes`

지원 쿼리:

- `platform=PC`
- `mode=Quick|Competitive`
- `tier=Quick|Overall|Bronze|Silver|Gold|Platinum|Diamond|Master|Celestial`
- `role=Vanguard|Duelist|Strategist`
- `sort=pickRate|winRate|hero`
