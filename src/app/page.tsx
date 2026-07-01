import { HeroDashboard } from "@/components/hero/HeroDashboard";
import { getHeroes } from "@/lib/heroService";
import ko from "@/locales/ko.json";

export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    const result = await getHeroes();
    return <HeroDashboard heroes={result.data} stale={result.stale} />;
  } catch {
    return <section className="error-panel"><p className="eyebrow">{ko.dashboard.eyebrow}</p><h1>{ko.dashboard.title}</h1><p>{ko.dashboard.loadError}</p></section>;
  }
}
