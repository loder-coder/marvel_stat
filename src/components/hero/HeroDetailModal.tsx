"use client";

import type { HeroMeta } from "@/lib/officialHeroParser";
import { RateBar } from "@/components/charts/RateBar";
import ko from "@/locales/ko.json";

export function HeroDetailModal({ hero, onClose }: { hero: HeroMeta | null; onClose: () => void }) {
  if (!hero) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="hero-detail-title" onMouseDown={(e) => e.stopPropagation()}>
        <button className="modal-close" type="button" aria-label={ko.labels.close} onClick={onClose}>×</button>
        <p className="eyebrow">{ko.roles[hero.role as keyof typeof ko.roles] ?? hero.role}</p><h2 id="hero-detail-title">{ko.heroes[hero.hero as keyof typeof ko.heroes] ?? hero.hero}</h2>
        <div className="detail-grid"><div><span>{ko.labels.platform}</span><strong>{hero.platform}</strong></div><div><span>{ko.labels.mode}</span><strong>{ko.modes[hero.mode]}</strong></div><div><span>{ko.labels.tier}</span><strong>{ko.tiers[hero.tier]}</strong></div></div>
        <div className="detail-rates"><div><span>{ko.labels.pickRate}</span><RateBar kind="pick" value={hero.pickRate} /></div><div><span>{ko.labels.winRate}</span><RateBar kind="win" value={hero.winRate} /></div></div>
      </section>
    </div>
  );
}
