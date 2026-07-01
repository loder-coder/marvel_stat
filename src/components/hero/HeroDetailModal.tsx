"use client";

import type { HeroMeta } from "@/lib/officialHeroParser";
import { RateBar } from "@/components/charts/RateBar";

export function HeroDetailModal({ hero, onClose }: { hero: HeroMeta | null; onClose: () => void }) {
  if (!hero) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="hero-detail-title" onMouseDown={(e) => e.stopPropagation()}>
        <button className="modal-close" type="button" aria-label="닫기" onClick={onClose}>×</button>
        <p className="eyebrow">{hero.role}</p><h2 id="hero-detail-title">{hero.hero}</h2>
        <div className="detail-grid"><div><span>Platform</span><strong>{hero.platform}</strong></div><div><span>Mode</span><strong>{hero.mode}</strong></div><div><span>Tier</span><strong>{hero.tier}</strong></div></div>
        <div className="detail-rates"><div><span>Pick Rate</span><RateBar kind="pick" value={hero.pickRate} /></div><div><span>Win Rate</span><RateBar kind="win" value={hero.winRate} /></div></div>
      </section>
    </div>
  );
}
