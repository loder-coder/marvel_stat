import { NextResponse } from "next/server";
import { RefreshInProgressError, refreshHeroes } from "@/lib/heroService";
import { saveHeroMetaSnapshots, type HistorySaveResult } from "@/lib/heroMetaHistory";

async function persistHistory(result: Awaited<ReturnType<typeof refreshHeroes>>): Promise<HistorySaveResult> {
  try {
    return await saveHeroMetaSnapshots({
      heroes: result.data,
      season: result.season,
      source: result.source,
      sourceUrl: result.sourceUrl,
      capturedAt: result.updatedAt
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn("[hero-history] Unexpected history persistence failure", error);
    return { enabled: true, saved: 0, inserted: 0, updated: 0, snapshotDate: result.updatedAt.toISOString().slice(0, 10), warning: reason };
  }
}

/** Runs the shared refresh response after route-level authentication succeeds. */
export async function executeMetaRefresh(): Promise<NextResponse> {
  try {
    const result = await refreshHeroes();
    const history = await persistHistory(result);
    return NextResponse.json({
      ok: true,
      source: result.source,
      season: result.season,
      rankFilters: result.availableRankFilters,
      count: result.data.length,
      updatedAt: result.updatedAt,
      history,
      partialErrors: result.partialErrors
    });
  } catch (error) {
    if (error instanceof RefreshInProgressError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[meta-refresh] RivalsMeta refresh failed", error);
    return NextResponse.json({ error: "RivalsMeta refresh failed" }, { status: 502 });
  }
}
