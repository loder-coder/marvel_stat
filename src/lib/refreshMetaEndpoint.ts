import { NextResponse } from "next/server";
import { RefreshInProgressError, refreshHeroes } from "@/lib/heroService";

/** Runs the shared refresh response after route-level authentication succeeds. */
export async function executeMetaRefresh(): Promise<NextResponse> {
  try {
    const result = await refreshHeroes();
    return NextResponse.json({
      ok: true,
      source: result.source,
      season: result.season,
      rankFilters: result.availableRankFilters,
      count: result.data.length,
      updatedAt: result.updatedAt,
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
