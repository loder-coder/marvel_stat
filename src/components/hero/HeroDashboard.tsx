"use client";

import { useCallback, useMemo, useState } from "react";
import { FilterBar } from "@/components/filters/FilterBar";
import { HeroDrawer } from "@/components/hero/HeroDrawer";
import { HeroRow } from "@/components/hero/HeroRow";
import { DataTable } from "@/components/ui/DataTable";
import { rankHeroMeta, type MetaTier, type RankedHero } from "@/lib/metaTier";
import type { HeroMeta, HeroMode, HeroTier } from "@/lib/officialHeroParser";
import type { HeroSource } from "@/lib/heroService";
import {
  localizeField,
  localizeHeroName,
  localizeOriginalLink,
  localizeRankFilter,
  localizeRefreshPolicy,
  localizeSort
} from "@/lib/localize";
import ko from "@/locales/ko.json";

export type TableSort = "rank" | "hero" | "pickRate" | "winRate";
type SortDirection = "asc" | "desc";

type Props = {
  heroes: HeroMeta[];
  stale: boolean;
  source: HeroSource;
  sourceUrl: string;
};

export function HeroDashboard({ heroes, stale, source, sourceUrl }: Props) {
  const isRivalsMeta = source === "rivalsmeta";
  const [mode, setMode] = useState<HeroMode>(isRivalsMeta ? "Competitive" : "Quick");
  const [tier, setTier] = useState<HeroTier>(isRivalsMeta ? "Overall" : "Quick");
  const [role, setRole] = useState("");
  const [metaTier, setMetaTier] = useState<MetaTier | "">("");
  const [season, setSeason] = useState(heroes[0]?.season ?? "");
  const [rankFilter, setRankFilter] = useState(heroes[0]?.rankFilter ?? "");
  const [sort, setSort] = useState<TableSort>("rank");
  const [direction, setDirection] = useState<SortDirection>("asc");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RankedHero | null>(null);

  const population = useMemo(() => rankHeroMeta(heroes.filter((hero) =>
    isRivalsMeta
      ? (!season || hero.season === season) && (!rankFilter || hero.rankFilter === rankFilter)
      : hero.mode === mode && hero.tier === tier
  )), [heroes, isRivalsMeta, season, rankFilter, mode, tier]);
  const roles = useMemo(() => [...new Set(population.map((hero) => hero.role).filter(Boolean))].sort(), [population]);
  const availableSeasons = useMemo(() => [...new Set(heroes.map((hero) => hero.season).filter((value): value is string => Boolean(value)))], [heroes]);
  const availableRanks = useMemo(() => [...new Set(heroes.map((hero) => hero.rankFilter).filter((value): value is string => Boolean(value)))], [heroes]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = population.filter((hero) => {
      const name = localizeHeroName(hero.hero);
      const searchText = `${hero.hero} ${name}`.toLowerCase();
      return (!role || hero.role === role) &&
        (!metaTier || hero.metaTier === metaTier) &&
        (!query || searchText.includes(query));
    });
    return result.sort((a, b) => {
      let comparison: number;
      if (sort === "hero") {
        const aName = localizeHeroName(a.hero);
        const bName = localizeHeroName(b.hero);
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
  const patchLabel = isRivalsMeta
    ? `${heroes[0].season ?? "-"} / ${localizeRankFilter(heroes[0].rankFilter ?? "-")}`
    : new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeZone: "Asia/Seoul" }).format(updatedAt);

  const changeMode = useCallback((value: HeroMode) => {
    setMode(value); setTier(value === "Quick" ? "Quick" : "Overall"); setSelected(null);
  }, []);
  const selectHero = useCallback((hero: RankedHero) => setSelected(hero), []);
  const closeDrawer = useCallback(() => setSelected(null), []);
  const changeSort = useCallback((next: TableSort) => {
    if (next === sort) setDirection((current) => current === "asc" ? "desc" : "asc");
    else { setSort(next); setDirection(next === "hero" || next === "rank" ? "asc" : "desc"); }
  }, [sort]);
  const sortMark = (column: TableSort) => sort === column ? (direction === "asc" ? "\u2191" : "\u2193") : "";

  return (
    <>
      <div className="page-header">
        <div><p className="section-path">{ko.site.navigation} / {ko.dashboard.metaTitle}</p><h1>{ko.dashboard.metaTitle}</h1></div>
        <dl className="meta-summary">
          <div><dt>{ko.dashboard.updatedAt}</dt><dd>{formattedUpdate}{stale && <em>{ko.dashboard.stale}</em>}</dd></div>
          <div><dt>{ko.dashboard.patch}</dt><dd>{patchLabel}</dd></div>
        </dl>
      </div>
      {isRivalsMeta && (
        <div className="source-notice">
          <strong>{ko.dashboard.dataScope}: {season} / {localizeRankFilter(rankFilter)}</strong>
          <p>{localizeRefreshPolicy("daily_cron_manual_refresh")}</p>
          <a href={sourceUrl} target="_blank" rel="noreferrer">{localizeOriginalLink()}</a>
        </div>
      )}

      <FilterBar source={source} mode={mode} tier={tier} role={role} metaTier={metaTier}
        season={season} rankFilter={rankFilter} availableSeasons={availableSeasons} availableRanks={availableRanks}
        search={search} roles={roles} onMode={changeMode} onTier={setTier} onRole={setRole}
        onMetaTier={setMetaTier} onSeason={setSeason} onRankFilter={setRankFilter} onSearch={setSearch} />

      <section className="table-panel" aria-label="히어로 메타 목록">
        <div className="table-toolbar">
          <strong>{ko.dashboard.heroCount} <b>{visible.length}</b></strong>
          <span>{isRivalsMeta ? `${season} / ${localizeRankFilter(rankFilter)}` : `${ko.modes[mode]} / ${ko.tiers[tier]}`}</span>
          <a href={sourceUrl} target="_blank" rel="noreferrer">{isRivalsMeta ? localizeOriginalLink() : ko.navigation.officialData}</a>
        </div>
        <DataTable>
          <thead><tr>
            <th><button title={localizeSort("rank")} onClick={() => changeSort("rank")}>{localizeField("rank")} {sortMark("rank")}</button></th>
            <th>{localizeField("metaTier")}</th>
            <th><button title={localizeSort("hero")} onClick={() => changeSort("hero")}>{localizeField("hero")} {sortMark("hero")}</button></th>
            <th>{localizeField("role")}</th>
            <th><button title={localizeSort("pickRate")} onClick={() => changeSort("pickRate")}>{localizeField("pickRate")} {sortMark("pickRate")}</button></th>
            <th><button title={localizeSort("winRate")} onClick={() => changeSort("winRate")}>{localizeField("winRate")} {sortMark("winRate")}</button></th>
            <th>{localizeField("trend")}</th>
          </tr></thead>
          <tbody>{visible.map((hero, index) => <HeroRow key={`${hero.source}-${hero.hero}`} hero={hero} position={index + 1} onSelect={selectHero} />)}</tbody>
        </DataTable>
        {visible.length === 0 && <p className="empty">{ko.dashboard.empty}</p>}
      </section>
      {isRivalsMeta && <p className="source-policy">{ko.dashboard.attribution}</p>}
      <HeroDrawer hero={selected} onClose={closeDrawer} />
    </>
  );
}
