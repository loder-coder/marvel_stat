"use client";

import type { HeroMode, HeroTier } from "@/lib/officialHeroParser";
import type { HeroSort } from "@/lib/heroService";

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
      <label><span>Platform</span><select disabled value="PC"><option>PC</option></select></label>
      <label><span>Mode</span><select value={props.mode} onChange={(e) => props.onMode(e.target.value as HeroMode)}><option>Quick</option><option>Competitive</option></select></label>
      <label><span>Tier</span><select value={props.tier} onChange={(e) => props.onTier(e.target.value as HeroTier)}>{tiers.map((tier) => <option key={tier}>{tier}</option>)}</select></label>
      <label><span>Role</span><select value={props.role} onChange={(e) => props.onRole(e.target.value)}><option value="">All roles</option>{props.roles.map((role) => <option key={role}>{role}</option>)}</select></label>
      <label><span>Sort</span><select value={props.sort} onChange={(e) => props.onSort(e.target.value as HeroSort)}><option value="pickRate">Pick Rate</option><option value="winRate">Win Rate</option><option value="hero">Hero</option></select></label>
      <label className="hero-search"><span>Hero search</span><input type="search" placeholder="Search heroes" value={props.search} onChange={(e) => props.onSearch(e.target.value)} /></label>
    </div>
  );
}
