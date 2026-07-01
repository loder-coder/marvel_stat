"use client";

import type { HeroMode, HeroTier } from "@/lib/officialHeroParser";
import type { MetaTier } from "@/lib/metaTier";
import ko from "@/locales/ko.json";

type Props = {
  mode: HeroMode; tier: HeroTier; role: string; metaTier: MetaTier | "";
  search: string; roles: string[];
  onMode: (value: HeroMode) => void; onTier: (value: HeroTier) => void;
  onRole: (value: string) => void; onMetaTier: (value: MetaTier | "") => void;
  onSearch: (value: string) => void;
};

export function FilterBar(props: Props) {
  const tiers: HeroTier[] = props.mode === "Quick"
    ? ["Quick"]
    : ["Overall", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Celestial"];
  return (
    <div className="filter-bar" aria-label="히어로 메타 필터">
      <label><span>{ko.labels.platform}</span><select disabled value="PC"><option>PC</option></select></label>
      <label><span>{ko.labels.mode}</span><select value={props.mode} onChange={(e) => props.onMode(e.target.value as HeroMode)}><option value="Quick">{ko.modes.Quick}</option><option value="Competitive">{ko.modes.Competitive}</option></select></label>
      <label><span>{ko.labels.tier}</span><select value={props.tier} onChange={(e) => props.onTier(e.target.value as HeroTier)}>{tiers.map((tier) => <option key={tier} value={tier}>{ko.tiers[tier]}</option>)}</select></label>
      <label><span>{ko.labels.role}</span><select value={props.role} onChange={(e) => props.onRole(e.target.value)}><option value="">{ko.labels.allRoles}</option>{props.roles.map((role) => <option key={role} value={role}>{ko.roles[role as keyof typeof ko.roles] ?? role}</option>)}</select></label>
      <label><span>{ko.labels.metaTier}</span><select value={props.metaTier} onChange={(e) => props.onMetaTier(e.target.value as MetaTier | "")}><option value="">{ko.labels.allMetaTiers}</option>{["OP", "S", "A", "B", "C", "D"].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="search-field"><span>{ko.labels.heroSearch}</span><input type="search" placeholder={ko.labels.searchPlaceholder} value={props.search} onChange={(e) => props.onSearch(e.target.value)} /></label>
    </div>
  );
}
