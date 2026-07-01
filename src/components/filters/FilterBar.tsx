"use client";

import type { HeroMode, HeroTier } from "@/lib/officialHeroParser";
import type { MetaTier } from "@/lib/metaTier";
import type { HeroSource } from "@/lib/heroService";
import { localizeField, localizeRankFilter, localizeRole, localizeTier } from "@/lib/localize";
import ko from "@/locales/ko.json";

export const RANK_FILTERS = [
  "All Ranks", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Diamond+",
  "Grandmaster", "Grandmaster+", "Celestial", "Celestial+", "Eternity", "Eternity+", "One Above All"
] as const;

type Props = {
  source: HeroSource;
  mode: HeroMode; tier: HeroTier; role: string; metaTier: MetaTier | "";
  season: string; rankFilter: string; availableSeasons: string[]; availableRanks: string[];
  search: string; roles: string[];
  onMode: (value: HeroMode) => void; onTier: (value: HeroTier) => void;
  onRole: (value: string) => void; onMetaTier: (value: MetaTier | "") => void;
  onSeason: (value: string) => void; onRankFilter: (value: string) => void;
  onSearch: (value: string) => void;
};

export function FilterBar(props: Props) {
  const tiers: HeroTier[] = props.mode === "Quick"
    ? ["Quick"]
    : ["Overall", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Celestial"];
  return (
    <div className={`filter-bar${props.source === "rivalsmeta" ? " rivalsmeta-filters" : ""}`} aria-label="히어로 메타 필터">
      <label><span>{localizeField("platform")}</span><select disabled value="PC"><option>PC</option></select></label>
      {props.source === "rivalsmeta" ? (
        <>
          <label><span>{localizeField("season")}</span><select value={props.season} onChange={(e) => props.onSeason(e.target.value)}>{props.availableSeasons.map((season) => <option key={season} value={season}>{season}</option>)}</select></label>
          <label><span>{localizeField("rankFilter")}</span><select value={props.rankFilter} onChange={(e) => props.onRankFilter(e.target.value)}>{RANK_FILTERS.map((rank) => <option key={rank} value={rank} disabled={!props.availableRanks.includes(rank)}>{localizeRankFilter(rank)}</option>)}</select></label>
        </>
      ) : (
        <>
          <label><span>{ko.labels.mode}</span><select value={props.mode} onChange={(e) => props.onMode(e.target.value as HeroMode)}><option value="Quick">{ko.modes.Quick}</option><option value="Competitive">{ko.modes.Competitive}</option></select></label>
          <label><span>{ko.labels.tier}</span><select value={props.tier} onChange={(e) => props.onTier(e.target.value as HeroTier)}>{tiers.map((tier) => <option key={tier} value={tier}>{ko.tiers[tier]}</option>)}</select></label>
          <label><span>{ko.labels.role}</span><select value={props.role} onChange={(e) => props.onRole(e.target.value)}><option value="">{ko.labels.allRoles}</option>{props.roles.map((role) => <option key={role} value={role}>{localizeRole(role)}</option>)}</select></label>
        </>
      )}
      <label><span>{localizeField("metaTier")}</span><select value={props.metaTier} onChange={(e) => props.onMetaTier(e.target.value as MetaTier | "")}><option value="">{localizeField("allMetaTiers")}</option>{["S", "A", "B", "C", "D"].map((value) => <option key={value} value={value}>{localizeTier(value)}</option>)}</select></label>
      <label className="search-field"><span>{localizeField("search")}</span><input type="search" placeholder={ko.labels.searchPlaceholder} value={props.search} onChange={(e) => props.onSearch(e.target.value)} /></label>
    </div>
  );
}
