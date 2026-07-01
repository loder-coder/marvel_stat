"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import type { RankedHero } from "@/lib/metaTier";
import { TierBadge } from "@/components/ui/TierBadge";
import { StatCell } from "@/components/ui/StatCell";
import { localizeField, localizeHeroName, localizeRole } from "@/lib/localize";
import ko from "@/locales/ko.json";

const HeroTrendChart = dynamic(
  () => import("@/components/hero/HeroTrendChart").then((module) => module.HeroTrendChart),
  { loading: () => <p className="trend-state">{ko.history.loading}</p> }
);

export function HeroDrawer({ hero, onClose }: { hero: RankedHero | null; onClose: () => void }) {
  useEffect(() => {
    if (!hero) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [hero, onClose]);
  if (!hero) return null;
  const name = localizeHeroName(hero.hero);
  return (
    <>
      <button className="detail-scrim" aria-label={ko.labels.close} onClick={onClose} />
      <aside className="hero-drawer" role="dialog" aria-modal="true" aria-labelledby="hero-detail-title">
        <div className="drawer-head"><strong>{localizeField("hero")}</strong><button type="button" onClick={onClose} aria-label={ko.labels.close}>×</button></div>
        <div className="hero-identity">
          <div className="hero-portrait" aria-hidden="true">{name.slice(0, 1)}</div>
          <div><TierBadge tier={hero.metaTier} /><h2 id="hero-detail-title">{name}</h2><p>{hero.role ? localizeRole(hero.role) : "—"}</p></div>
        </div>
        <dl className="drawer-stats">
          <div><dt>{localizeField("pickRate")}</dt><dd>{hero.source === "rivalsmeta" ? "—" : <StatCell value={hero.pickRate} />}</dd></div>
          <div><dt>{localizeField("winRate")}</dt><dd><StatCell value={hero.winRate} emphasis /></dd></div>
          <div><dt>{localizeField("metaScore")}</dt><dd>{hero.metaScore.toFixed(2)}</dd></div>
          <div><dt>{localizeField("updatedAt")}</dt><dd>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeZone: "Asia/Seoul" }).format(new Date(hero.updatedAt))}</dd></div>
        </dl>
        {hero.source === "rivalsmeta" && hero.rankFilter && hero.season && (
          <HeroTrendChart hero={hero.hero} rankFilter={hero.rankFilter} season={hero.season} />
        )}
        {!hero.metaTier && <p className="drawer-note">{ko.dashboard.excluded}</p>}
      </aside>
    </>
  );
}
