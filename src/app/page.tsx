import { HeroDashboard } from "@/components/hero/HeroDashboard";
import { getHeroes } from "@/lib/heroService";

export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    const result = await getHeroes();
    return <HeroDashboard heroes={result.data} stale={result.stale} />;
  } catch {
    return <section className="error-panel"><p className="eyebrow">OFFICIAL HERO HOT LIST</p><h1>Hero Meta Dashboard</h1><p>공식 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p></section>;
  }
}
