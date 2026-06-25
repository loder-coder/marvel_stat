import { getHeroMeta, TIER_ORDER, type HeroMeta } from "@/app/heroes/heroMeta";

export const revalidate = 3600;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const ALL_ROLE = "전체";
const ROLES = [ALL_ROLE, "공격형", "수호형", "지원형", "Duelist", "Vanguard", "Strategist"] as const;
const SORTS = [
  { key: "tier", label: "티어" },
  { key: "winRate", label: "승률" },
  { key: "kda", label: "KDA" },
  { key: "matches", label: "경기수" }
] as const;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function hrefFor(role: string, sort: string): string {
  const params = new URLSearchParams();
  if (role !== ALL_ROLE) params.set("role", role);
  params.set("sort", sort);
  return `/heroes?${params.toString()}`;
}

function sortHeroes(heroes: HeroMeta[], sort: string): HeroMeta[] {
  if (sort === "tier") {
    return [...heroes].sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || b.winRate - a.winRate);
  }

  const key = sort === "kda" || sort === "matches" ? sort : "winRate";
  return [...heroes].sort((a, b) => b[key] - a[key]);
}

function displayRoles(heroes: HeroMeta[]): string[] {
  const roles = new Set(heroes.map((hero) => hero.role).filter(Boolean));
  const ordered = ROLES.filter((role) => role === ALL_ROLE || roles.has(role));
  return ordered.length > 1 ? ordered : [ALL_ROLE, ...roles];
}

export default async function HeroesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const selectedSort = first(params.sort) ?? "tier";

  let heroes: HeroMeta[];

  try {
    heroes = await getHeroMeta();
  } catch {
    return (
      <section className="panel">
        <p className="eyebrow">HERO META</p>
        <h1>영웅 메타</h1>
        <p className="notice error">영웅 데이터를 불러오지 못했습니다.</p>
      </section>
    );
  }

  const availableRoles = displayRoles(heroes);
  const requestedRole = first(params.role) ?? ALL_ROLE;
  const selectedRole = availableRoles.includes(requestedRole) ? requestedRole : ALL_ROLE;
  const filtered = selectedRole === ALL_ROLE ? heroes : heroes.filter((hero) => hero.role === selectedRole);
  const sorted = sortHeroes(filtered, selectedSort);

  return (
    <section className="panel heroes-panel">
      <p className="eyebrow">HERO META</p>
      <h1>영웅 메타</h1>
      <p className="updated">경기 수와 승률을 함께 반영한 티어 기준으로 영웅 메타를 보여줍니다.</p>

      <div className="filter-row">
        <div className="filter-group" aria-label="포지션 필터">
          {availableRoles.map((role) => (
            <a
              key={role}
              aria-current={role === selectedRole ? "true" : undefined}
              className="filter-pill"
              href={hrefFor(role, selectedSort)}
            >
              {role}
            </a>
          ))}
        </div>

        <div className="filter-group" aria-label="정렬">
          {SORTS.map((sort) => (
            <a
              key={sort.key}
              aria-current={sort.key === selectedSort ? "true" : undefined}
              className="filter-pill"
              href={hrefFor(selectedRole, sort.key)}
            >
              {sort.label}
            </a>
          ))}
        </div>
      </div>

      <table className="hero-meta-table">
        <thead>
          <tr>
            <th>티어</th>
            <th>영웅</th>
            <th>포지션</th>
            <th>경기수</th>
            <th>승률</th>
            <th>KDA</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((hero) => (
            <tr key={hero.heroId}>
              <td>
                <span className={`tier-badge tier-${hero.tier === "권외" ? "none" : hero.tier.toLowerCase()}`}>{hero.tier}</span>
              </td>
              <td>
                <span className="hero-cell">
                  {hero.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" className="hero-icon" src={hero.thumbnail} />
                  ) : (
                    <span className="hero-icon hero-icon-empty" />
                  )}
                  <strong>{hero.heroName}</strong>
                </span>
              </td>
              <td>{hero.role}</td>
              <td>{hero.matches.toLocaleString("ko-KR")}</td>
              <td className={hero.winRate >= 50 ? "win" : "loss"}>{hero.winRate.toFixed(1)}%</td>
              <td>{hero.kda.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
