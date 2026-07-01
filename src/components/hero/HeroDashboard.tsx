"use client";

import { useCallback, useMemo, useState } from "react";
import { FilterBar } from "@/components/filters/FilterBar";
import { HeroDrawer } from "@/components/hero/HeroDrawer";
import { HeroRow } from "@/components/hero/HeroRow";
import { DataTable } from "@/components/ui/DataTable";
import { rankHeroMeta, type MetaTier, type RankedHero } from "@/lib/metaTier";
import type { HeroMeta, HeroMode, HeroTier } from "@/lib/officialHeroParser";
import ko from "@/locales/ko.json";

export type TableSort = "rank" | "hero" | "pickRate" | "winRate";
type SortDirection = "asc" | "desc";

export function HeroDashboard({ heroes, stale }: { heroes: HeroMeta[]; stale: boolean }) {
  const [mode, setMode] = useState<HeroMode>("Quick");
  const [tier, setTier] = useState<HeroTier>("Quick");
  const [role, setRole] = useState("");
  const [metaTier, setMetaTier] = useState<MetaTier | "">("");
  const [sort, setSort] = useState<TableSort>("rank");
  const [direction, setDirection] = useState<SortDirection>("asc");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RankedHero | null>(null);

  const population = useMemo(
    () => rankHeroMeta(heroes.filter((hero) => hero.mode === mode && hero.tier === tier)),
    [heroes, mode, tier]
  );
  const roles = useMemo(() => [...new Set(population.map((hero) => hero.role))].sort(), [population]);
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = population.filter((hero) => {
      const name = ko.heroes[hero.hero as keyof typeof ko.heroes] ?? hero.hero;
      return (!role || hero.role === role) &&
        (!metaTier || hero.metaTier === metaTier) &&
        (!query || hero.hero.toLowerCase().includes(query) || name.toLowerCase().includes(query));
    });
    return result.sort((a, b) => {
      let comparison: number;
      if (sort === "hero") {
        const aName = ko.heroes[a.hero as keyof typeof ko.heroes] ?? a.hero;
        const bName = ko.heroes[b.hero as keyof typeof ko.heroes] ?? b.hero;
        comparison = aName.localeCompare(bName, "ko");
      } else if (sort === "rank") {
        comparison = (a.metaRank ?? Number.MAX_SAFE_INTEGER) - (b.metaRank ?? Number.MAX_SAFE_INTEGER);
      } else {
        comparison = a[sort] - b[sort];
      }
      return direction === "asc" ? comparison : -comparison;
    });
  }, [population, role, metaTier, search, sort, direction]);

  const updatedAt = new Date(heroes[0].updatedAt);
  const formattedUpdate = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(updatedAt);
  const patchLabel = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Seoul" }).format(updatedAt);

  const changeMode = useCallback((value: HeroMode) => {
    setMode(value); setTier(value === "Quick" ? "Quick" : "Overall"); setSelected(null);
  }, []);
  const selectHero = useCallback((hero: RankedHero) => setSelected(hero), []);
  const closeDrawer = useCallback(() => setSelected(null), []);
  const changeSort = useCallback((next: TableSort) => {
    if (next === sort) setDirection((current) => current === "asc" ? "desc" : "asc");
    else { setSort(next); setDirection(next === "hero" || next === "rank" ? "asc" : "desc"); }
  }, [sort]);

  const sortMark = (column: TableSort) => sort === column ? (direction === "asc" ? "▲" : "▼") : "";

  return (
    <>
      <div className="page-header">
        <div><p className="section-path">{ko.site.navigation} / {ko.dashboard.metaTitle}</p><h1>{ko.dashboard.metaTitle}</h1></div>
        <dl className="meta-summary">
          <div><dt>{ko.dashboard.updatedAt}</dt><dd>{formattedUpdate}{stale && <em>{ko.dashboard.stale}</em>}</dd></div>
          <div><dt>{ko.dashboard.patch}</dt><dd>{patchLabel}</dd></div>
        </dl>
      </div>

      <FilterBar mode={mode} tier={tier} role={role} metaTier={metaTier} search={search} roles={roles}
        onMode={changeMode} onTier={setTier} onRole={setRole} onMetaTier={setMetaTier} onSearch={setSearch} />

      <section className="table-panel" aria-label="히어로 메타 목록">
        <div className="table-toolbar"><strong>{ko.dashboard.heroCount} <b>{visible.length}</b></strong><span>{ko.modes[mode]} · {ko.tiers[tier]}</span></div>
        <DataTable>
          <thead><tr>
            <th><button onClick={() => changeSort("rank")}>{ko.labels.rank} {sortMark("rank")}</button></th>
            <th>{ko.labels.metaTier}</th>
            <th><button onClick={() => changeSort("hero")}>{ko.labels.hero} {sortMark("hero")}</button></th>
            <th>{ko.labels.role}</th>
            <th><button onClick={() => changeSort("pickRate")}>{ko.labels.pickRate} {sortMark("pickRate")}</button></th>
            <th><button onClick={() => changeSort("winRate")}>{ko.labels.winRate} {sortMark("winRate")}</button></th>
            <th>{ko.labels.trend}</th>
          </tr></thead>
          <tbody>{visible.map((hero, index) => <HeroRow key={`${hero.mode}-${hero.tier}-${hero.role}-${hero.hero}`} hero={hero} position={index + 1} onSelect={selectHero} />)}</tbody>
        </DataTable>
        {visible.length === 0 && <p className="empty">{ko.dashboard.empty}</p>}
      </section>
      <HeroDrawer hero={selected} onClose={closeDrawer} />
    </>
  );
}
