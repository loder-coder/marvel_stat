import { getHeroMeta, ROLE_KO_OPTIONS } from "@/app/heroes/heroMeta";
import { saveHeroTranslation } from "@/app/admin/heroes/actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isAuthorized(key?: string): boolean {
  return !process.env.ADMIN_SECRET || key === process.env.ADMIN_SECRET;
}

export default async function AdminHeroesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const adminKey = first(params.key) ?? "";

  if (!isAuthorized(adminKey)) {
    return (
      <section className="panel">
        <p className="eyebrow">ADMIN</p>
        <h1>영웅 번역 관리</h1>
        <p className="notice error">관리자 키가 올바르지 않습니다.</p>
      </section>
    );
  }

  let heroes = [];

  try {
    heroes = await getHeroMeta();
  } catch {
    return (
      <section className="panel">
        <p className="eyebrow">ADMIN</p>
        <h1>영웅 번역 관리</h1>
        <p className="notice error">영웅 데이터를 불러오지 못했습니다.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <p className="eyebrow">ADMIN</p>
      <h1>영웅 번역 관리</h1>
      <p className="updated">저장하면 /heroes 페이지의 영웅명과 역할군 표기가 갱신됩니다.</p>

      <table>
        <thead>
          <tr>
            <th>영웅 ID</th>
            <th>현재 이름</th>
            <th>한글 이름</th>
            <th>역할군</th>
            <th>저장</th>
          </tr>
        </thead>
        <tbody>
          {heroes.map((hero) => (
            <tr key={hero.heroId}>
              <td>{hero.heroId}</td>
              <td>{hero.heroName}</td>
              <td colSpan={3}>
                <form action={saveHeroTranslation} className="admin-hero-form">
                  <input name="adminKey" type="hidden" value={adminKey} />
                  <input name="heroId" type="hidden" value={hero.heroId} />
                  <input aria-label={`${hero.heroName} 한글 이름`} name="nameKo" required type="text" defaultValue={hero.heroName} />
                  <select aria-label={`${hero.heroName} 역할군`} name="roleKo" required defaultValue={hero.role}>
                    {ROLE_KO_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <button type="submit">저장</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
