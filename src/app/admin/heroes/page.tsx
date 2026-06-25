import { requireAdminSession } from "@/app/admin/auth";
import { saveHeroTranslation } from "@/app/admin/heroes/actions";
import { logoutAdmin } from "@/app/admin/login/actions";
import { getHeroMeta, ROLE_KO_OPTIONS, ROLE_TRANSLATIONS, type HeroMeta } from "@/app/heroes/heroMeta";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function defaultRoleKo(role: string): string {
  return ROLE_TRANSLATIONS[role] ?? (ROLE_KO_OPTIONS.includes(role as (typeof ROLE_KO_OPTIONS)[number]) ? role : ROLE_KO_OPTIONS[0]);
}

function statusMessage(saved?: string, error?: string) {
  if (saved === "1") return <p className="badge">저장되었습니다.</p>;
  if (error === "invalid") return <p className="notice error">영웅 이름과 역할군을 모두 입력해주세요.</p>;
  if (error === "invalid-role") return <p className="notice error">역할군 값이 올바르지 않습니다.</p>;
  if (error === "save-failed") {
    return (
      <p className="notice error">
        저장에 실패했습니다. Vercel의 Supabase 환경변수, HeroTranslation 테이블, RLS 정책을 확인해주세요.
      </p>
    );
  }
  return null;
}

export default async function AdminHeroesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminSession();

  const params = await searchParams;
  let heroes: HeroMeta[] = [];

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

      {statusMessage(first(params.saved), first(params.error))}

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
