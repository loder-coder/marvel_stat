import { requireAdminSession } from "@/app/admin/auth";
import { saveHeroTranslation } from "@/app/admin/heroes/actions";
import { logoutAdmin } from "@/app/admin/login/actions";
import { getHeroMeta, ROLE_KO_OPTIONS, ROLE_TRANSLATIONS, type HeroMeta, type HeroStatsStatus } from "@/app/heroes/heroMeta";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function defaultRoleKo(role: string): string {
  return ROLE_TRANSLATIONS[role] ?? (ROLE_KO_OPTIONS.includes(role as (typeof ROLE_KO_OPTIONS)[number]) ? role : ROLE_KO_OPTIONS[0]);
}

function statusMessage(saved?: string, error?: string) {
  if (saved === "1") return <p className="badge">Saved.</p>;
  if (error === "invalid") return <p className="notice error">Hero name and role are required.</p>;
  if (error === "invalid-role") return <p className="notice error">Invalid role value.</p>;
  if (error === "save-failed") {
    return <p className="notice error">Save failed. Check Supabase env vars, HeroTranslation table, and RLS/service role settings.</p>;
  }
  return null;
}

function statsSummary(heroes: HeroMeta[]) {
  const counts = heroes.reduce<Record<HeroStatsStatus, number>>(
    (acc, hero) => {
      acc[hero.statsStatus] += 1;
      return acc;
    },
    { ok: 0, "api-failed": 0, "invalid-response": 0, "missing-name": 0 }
  );

  if (counts["api-failed"] === 0 && counts["invalid-response"] === 0 && counts["missing-name"] === 0) {
    return <p className="badge">Stats API OK: {counts.ok}</p>;
  }

  return (
    <p className="notice error">
      Stats partial: OK {counts.ok} / API failed {counts["api-failed"]} / Invalid response {counts["invalid-response"]} / Missing name{" "}
      {counts["missing-name"]}. Check Vercel function logs for exact hero names and HTTP errors.
    </p>
  );
}

function statsLabel(hero: HeroMeta): string {
  if (hero.statsStatus === "ok") return "OK";
  if (hero.statsStatus === "api-failed") return "API failed";
  if (hero.statsStatus === "invalid-response") return "Invalid response";
  return "Missing name";
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
        <h1>Hero Translation Admin</h1>
        <p className="notice error">Failed to load hero data.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="title-row">
        <div>
          <p className="eyebrow">ADMIN</p>
          <h1>Hero Translation Admin</h1>
          <p className="updated">Saving updates the hero name and role labels shown on /heroes.</p>
        </div>
        <form action={logoutAdmin}>
          <button type="submit">Logout</button>
        </form>
      </div>

      {statusMessage(first(params.saved), first(params.error))}
      {statsSummary(heroes)}

      <table>
        <thead>
          <tr>
            <th>Hero ID</th>
            <th>Current name</th>
            <th>Stats status</th>
            <th>Korean name / role</th>
          </tr>
        </thead>
        <tbody>
          {heroes.map((hero) => (
            <tr key={hero.heroId}>
              <td>{hero.heroId}</td>
              <td>{hero.heroName}</td>
              <td title={hero.statsStatusDetail}>{statsLabel(hero)}</td>
              <td>
                <form action={saveHeroTranslation} className="admin-hero-form">
                  <input name="heroId" type="hidden" value={hero.heroId} />
                  <input aria-label={`${hero.heroName} Korean name`} name="nameKo" required type="text" defaultValue={hero.heroName} />
                  <select aria-label={`${hero.heroName} Korean role`} name="roleKo" required defaultValue={defaultRoleKo(hero.role)}>
                    {ROLE_KO_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <button type="submit">Save</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
