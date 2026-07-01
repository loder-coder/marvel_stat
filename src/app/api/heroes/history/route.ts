import { NextResponse } from "next/server";
import { getHeroMetaHistory } from "@/lib/heroMetaHistory";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const hero = params.get("hero")?.trim();
  if (!hero) return NextResponse.json({ error: "hero is required" }, { status: 400 });

  const rankFilter = params.get("rankFilter")?.trim() || "Diamond+";
  const season = params.get("season")?.trim() || undefined;
  const parsedDays = Number.parseInt(params.get("days") ?? "30", 10);
  const days = Math.min(180, Math.max(1, Number.isFinite(parsedDays) ? parsedDays : 30));

  try {
    return NextResponse.json(await getHeroMetaHistory({ hero, rankFilter, season, days }));
  } catch (error) {
    console.error("[hero-history] History query failed", error);
    return NextResponse.json({ error: "Hero history is unavailable" }, { status: 502 });
  }
}
