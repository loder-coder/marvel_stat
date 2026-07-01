"use client";

import type { HeroMode, HeroTier } from "@/lib/officialHeroParser";
import type { HeroSort } from "@/lib/heroService";
import ko from "@/locales/ko.json";

type Props = {
  mode: HeroMode; tier: HeroTier; role: string; sort: HeroSort; search: string; roles: string[];
  onMode: (value: HeroMode) => void; onTier: (value: HeroTier) => void;
  onRole: (value: string) => void; onSort: (value: HeroSort) => void; onSearch: (value: string) => void;
};

export function HeroFilters(props: Props) {
  const tiers: HeroTier[] = props.mode === "Quick"
    ? ["Quick"]
    : ["Overall", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Celestial"];
  return (
    <div className="filters" aria-label="히어로 메타 필터">
      <label><span>{ko.labels.platform}</span><select disabled value="PC"><option>PC</option></select></label>
      <label><span>{ko.labels.mode}</span><select value={props.mode} onChange={(e) => props.onMode(e.target.value as HeroMode)}><option value="Quick">{ko.modes.Quick}</option><option value="Competitive">{ko.modes.Competitive}</option></select></label>
      <label><span>{ko.labels.tier}</span><select value={props.tier} onChange={(e) => props.onTier(e.target.value as HeroTier)}>{tiers.map((tier) => <option key={tier} value={tier}>{ko.tiers[tier]}</option>)}</select></label>
      <label><span>{ko.labels.role}</span><select value={props.role} onChange={(e) => props.onRole(e.target.value)}><option value="">{ko.labels.allRoles}</option>{props.roles.map((role) => <option key={role} value={role}>{ko.roles[role as keyof typeof ko.roles] ?? role}</option>)}</select></label>
      <label><span>{ko.labels.sort}</span><select value={props.sort} onChange={(e) => props.onSort(e.target.value as HeroSort)}><option value="pickRate">{ko.sorts.pickRate}</option><option value="winRate">{ko.sorts.winRate}</option><option value="hero">{ko.sorts.hero}</option></select></label>
      <label className="hero-search"><span>{ko.labels.heroSearch}</span><input type="search" placeholder={ko.labels.searchPlaceholder} value={props.search} onChange={(e) => props.onSearch(e.target.value)} /></label>
    </div>
  );
}
