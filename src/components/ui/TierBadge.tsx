import type { MetaTier } from "@/lib/metaTier";

export function TierBadge({ tier }: { tier: MetaTier | null }) {
  return <span className={`tier-badge tier-${tier?.toLowerCase() ?? "none"}`}>{tier ?? "—"}</span>;
}
