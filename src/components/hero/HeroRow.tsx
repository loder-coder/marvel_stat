"use client";

import { memo } from "react";
import type { RankedHero } from "@/lib/metaTier";
import { TierBadge } from "@/components/ui/TierBadge";
import { StatCell } from "@/components/ui/StatCell";
import ko from "@/locales/ko.json";

type Props = { hero: RankedHero; position: number; onSelect: (hero: RankedHero) => void };

export const HeroRow = memo(function HeroRow({ hero, position, onSelect }: Props) {
  const name = ko.heroes[hero.hero as keyof typeof ko.heroes] ?? hero.hero;
  return (
    <tr tabIndex={0} onClick={() => onSelect(hero)} onKeyDown={(event) => event.key === "Enter" && onSelect(hero)}>
      <td className="rank-cell">{hero.metaRank ?? position}</td>
      <td><TierBadge tier={hero.metaTier} /></td>
      <td><span className="table-hero"><span className="hero-thumb">{name.slice(0, 1)}</span><strong>{name}</strong></span></td>
      <td><span className="role-text">{ko.roles[hero.role as keyof typeof ko.roles] ?? hero.role}</span></td>
      <td><StatCell value={hero.pickRate} /></td>
      <td><StatCell value={hero.winRate} emphasis /></td>
      <td className="trend-cell"><span>—</span><small>{ko.dashboard.trendUnavailable}</small></td>
    </tr>
  );
});
