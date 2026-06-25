import { NextResponse } from "next/server";
import { getHeroMeta } from "@/app/heroes/heroMeta";

export async function GET() {
  try {
    const heroes = await getHeroMeta();
    return NextResponse.json(heroes);
  } catch {
    return NextResponse.json({ error: "Failed to load hero metadata" }, { status: 502 });
  }
}
