"use client";

import { useMemo, useState } from "react";
import { HeroFilters } from "@/components/filters/HeroFilters";
import { RateBar } from "@/components/charts/RateBar";
import { HeroDetailModal } from "@/components/hero/HeroDetailModal";
import type { HeroMeta, HeroMode, HeroTier } from "@/lib/officialHeroParser";
import type { HeroSort } from "@/lib/heroService";
import ko from "@/locales/ko.json";

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
      .filter((hero) => {
        const translated = ko.heroes[hero.hero as keyof typeof ko.heroes] ?? hero.hero;
        return !query || hero.hero.toLowerCase().includes(query) || translated.toLowerCase().includes(query);
      })
      .sort((a, b) => sort === "hero"
        ? (ko.heroes[a.hero as keyof typeof ko.heroes] ?? a.hero).localeCompare(ko.heroes[b.hero as keyof typeof ko.heroes] ?? b.hero, "ko")
        : b[sort] - a[sort] || a.hero.localeCompare(b.hero));
  }, [heroes, mode, tier, role, search, sort]);

  function changeMode(value: HeroMode) { setMode(value); setTier(value === "Quick" ? "Quick" : "Overall"); }

  return (
    <>
      <section className="dashboard-head">
        <div><p className="eyebrow">{ko.dashboard.eyebrow}</p><h1>{ko.dashboard.title}</h1><p className="updated">{ko.dashboard.updatedAt} {new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(heroes[0].updatedAt))}{stale && <span className="stale-label">{ko.dashboard.stale}</span>}</p></div>
        <div className="summary"><span>{ko.dashboard.heroCount}</span><strong>{visible.length}</strong></div>
      </section>
      <HeroFilters mode={mode} tier={tier} role={role} sort={sort} search={search} roles={roles} onMode={changeMode} onTier={setTier} onRole={setRole} onSort={setSort} onSearch={setSearch} />
      <section className="hero-list" aria-label="히어로 목록">
        <div className="table-scroll"><table><thead><tr><th>{ko.labels.rank}</th><th>{ko.labels.hero}</th><th>{ko.labels.role}</th><th>{ko.labels.pickRate}</th><th>{ko.labels.winRate}</th></tr></thead>
          <tbody>{visible.map((hero, index) => <tr key={`${hero.mode}-${hero.tier}-${hero.role}-${hero.hero}`} tabIndex={0} onClick={() => setSelected(hero)} onKeyDown={(e) => e.key === "Enter" && setSelected(hero)}><td className="rank">{index + 1}</td><td><strong>{ko.heroes[hero.hero as keyof typeof ko.heroes] ?? hero.hero}</strong></td><td><span className={`role role-${hero.role.toLowerCase()}`}>{ko.roles[hero.role as keyof typeof ko.roles] ?? hero.role}</span></td><td><RateBar kind="pick" value={hero.pickRate} /></td><td><RateBar kind="win" value={hero.winRate} /></td></tr>)}</tbody>
        </table></div>
        {visible.length === 0 && <p className="empty">{ko.dashboard.empty}</p>}
      </section>
      <HeroDetailModal hero={selected} onClose={() => setSelected(null)} />
    </>
  );
}
