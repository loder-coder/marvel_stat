import { getHeroMeta, type HeroMeta } from "@/app/heroes/heroMeta";

export const revalidate = 3600;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const ROLES = ["전체", "Duelist", "Vanguard", "Strategist"] as const;
const SORTS = [
  { key: "winRate", label: "승률" },
  { key: "kda", label: "KDA" },
  { key: "matches", label: "경기수" }
] as const;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function hrefFor(role: string, sort: string): string {
  const params = new URLSearchParams();
  if (role !== "전체") params.set("role", role);
  params.set("sort", sort);
  return `/heroes?${params.toString()}`;
}

function formatHundredMillion(value: number): string {
  if (!value) return "-";
  return `${(value / 100000000).toFixed(1)}억`;
}

function sortHeroes(heroes: HeroMeta[], sort: string): HeroMeta[] {
  const key = sort === "kda" || sort === "matches" ? sort : "winRate";
  return [...heroes].sort((a, b) => b[key] - a[key]);
}

export default async function HeroesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const selectedRole = first(params.role) ?? "전체";
  const selectedSort = first(params.sort) ?? "winRate";

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

  const filtered = selectedRole === "전체" ? heroes : heroes.filter((hero) => hero.role === selectedRole);
  const sorted = sortHeroes(filtered, selectedSort);

  return (
    <section className="panel">
      <p className="eyebrow">HERO META</p>
      <h1>영웅 메타</h1>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "24px 0 12px" }}>
        {ROLES.map((role) => {
          const active = role === selectedRole;
          return (
            <a
              key={role}
              aria-current={active ? "true" : undefined}
              className={active ? "button" : "badge"}
              href={hrefFor(role, selectedSort)}
            >
              {role}
            </a>
          );
        })}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
        {SORTS.map((sort) => {
          const active = sort.key === selectedSort;
          return (
            <a
              key={sort.key}
              aria-current={active ? "true" : undefined}
              className={active ? "button" : "badge"}
              href={hrefFor(selectedRole, sort.key)}
            >
              {sort.label}
            </a>
          );
        })}
      </div>

      <table>
        <thead>
          <tr>
            <th>영웅</th>
            <th>포지션</th>
            <th>경기수</th>
            <th>승률</th>
            <th>KDA</th>
            <th>명중률</th>
            <th>총 딜</th>
            <th>총 힐</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((hero) => (
            <tr key={hero.heroId}>
              <td>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  {hero.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt=""
                      src={hero.thumbnail}
                      style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover" }}
                    />
                  ) : null}
                  <strong>{hero.heroName}</strong>
                </span>
              </td>
              <td>{hero.role}</td>
              <td>{hero.matches.toLocaleString("ko-KR")}</td>
              <td className={hero.winRate >= 50 ? "win" : "loss"}>{hero.winRate.toFixed(1)}%</td>
              <td>{hero.kda.toFixed(2)}</td>
              <td>{hero.hitRate.toFixed(1)}%</td>
              <td>{formatHundredMillion(hero.totalDamage)}</td>
              <td>{formatHundredMillion(hero.totalHeal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
