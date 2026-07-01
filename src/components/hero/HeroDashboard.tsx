"use client";

import { useMemo, useState } from "react";
import { HeroFilters } from "@/components/filters/HeroFilters";
import { RateBar } from "@/components/charts/RateBar";
import { HeroDetailModal } from "@/components/hero/HeroDetailModal";
import type { HeroMeta, HeroMode, HeroTier } from "@/lib/officialHeroParser";
import type { HeroSort } from "@/lib/heroService";

export function HeroDashboard({ heroes, stale }: { heroes: HeroMeta[]; stale: boolean }) {
  const [mode, setMode] = useState<HeroMode>("Quick");
  const [tier, setTier] = useState<HeroTier>("Quick");
  const [role, setRole] = useState("");
  const [sort, setSort] = useState<HeroSort>("pickRate");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<HeroMeta | null>(null);
  const roles = useMemo(() => [...new Set(heroes.map((hero) => hero.role))].sort(), [heroes]);
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return heroes.filter((hero) => hero.mode === mode && hero.tier === tier && (!role || hero.role === role))
      .filter((hero) => !query || hero.hero.toLowerCase().includes(query))
      .sort((a, b) => sort === "hero" ? a.hero.localeCompare(b.hero) : b[sort] - a[sort] || a.hero.localeCompare(b.hero));
  }, [heroes, mode, tier, role, search, sort]);

  function changeMode(value: HeroMode) { setMode(value); setTier(value === "Quick" ? "Quick" : "Overall"); }

  return (
    <>
      <section className="dashboard-head">
        <div><p className="eyebrow">OFFICIAL HERO HOT LIST</p><h1>Hero Meta Dashboard</h1><p className="updated">업데이트 {new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(heroes[0].updatedAt))}{stale && <span className="stale-label">마지막 성공 데이터</span>}</p></div>
        <div className="summary"><span>Heroes</span><strong>{visible.length}</strong></div>
      </section>
      <HeroFilters mode={mode} tier={tier} role={role} sort={sort} search={search} roles={roles} onMode={changeMode} onTier={setTier} onRole={setRole} onSort={setSort} onSearch={setSearch} />
      <section className="hero-list" aria-label="히어로 목록">
        <div className="table-scroll"><table><thead><tr><th>#</th><th>Hero</th><th>Role</th><th>Pick Rate</th><th>Win Rate</th></tr></thead>
          <tbody>{visible.map((hero, index) => <tr key={`${hero.mode}-${hero.tier}-${hero.role}-${hero.hero}`} tabIndex={0} onClick={() => setSelected(hero)} onKeyDown={(e) => e.key === "Enter" && setSelected(hero)}><td className="rank">{index + 1}</td><td><strong>{hero.hero}</strong></td><td><span className={`role role-${hero.role.toLowerCase()}`}>{hero.role}</span></td><td><RateBar kind="pick" value={hero.pickRate} /></td><td><RateBar kind="win" value={hero.winRate} /></td></tr>)}</tbody>
        </table></div>
        {visible.length === 0 && <p className="empty">조건에 맞는 히어로가 없습니다.</p>}
      </section>
      <HeroDetailModal hero={selected} onClose={() => setSelected(null)} />
    </>
  );
}
