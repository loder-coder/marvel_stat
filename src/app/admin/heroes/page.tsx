import { requireAdminSession } from "@/app/admin/auth";
import { saveHeroTranslation } from "@/app/admin/heroes/actions";
import { logoutAdmin } from "@/app/admin/login/actions";
import { getHeroMeta, ROLE_KO_OPTIONS, ROLE_TRANSLATIONS } from "@/app/heroes/heroMeta";

export const dynamic = "force-dynamic";

function defaultRoleKo(role: string): string {
  return ROLE_TRANSLATIONS[role] ?? (ROLE_KO_OPTIONS.includes(role as (typeof ROLE_KO_OPTIONS)[number]) ? role : ROLE_KO_OPTIONS[0]);
}

export default async function AdminHeroesPage() {
  await requireAdminSession();

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
      <div className="title-row">
        <div>
          <p className="eyebrow">ADMIN</p>
          <h1>영웅 번역 관리</h1>
          <p className="updated">저장하면 /heroes 페이지의 영웅명과 역할군 표기가 갱신됩니다.</p>
        </div>
        <form action={logoutAdmin}>
          <button type="submit">로그아웃</button>
        </form>
      </div>

      <table>
        <thead>
          <tr>
            <th>영웅 ID</th>
            <th>현재 이름</th>
            <th>한글 이름 / 역할군</th>
          </tr>
        </thead>
        <tbody>
          {heroes.map((hero) => (
            <tr key={hero.heroId}>
              <td>{hero.heroId}</td>
              <td>{hero.heroName}</td>
              <td>
                <form action={saveHeroTranslation} className="admin-hero-form">
                  <input name="heroId" type="hidden" value={hero.heroId} />
                  <input aria-label={`${hero.heroName} 한글 이름`} name="nameKo" required type="text" defaultValue={hero.heroName} />
                  <select aria-label={`${hero.heroName} 역할군`} name="roleKo" required defaultValue={defaultRoleKo(hero.role)}>
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
