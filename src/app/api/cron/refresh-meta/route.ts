import { NextResponse } from "next/server";
import { authorizeRefreshRequest } from "@/lib/refreshAuth";
import { executeMetaRefresh } from "@/lib/refreshMetaEndpoint";

/** Vercel Cron uses GET and automatically supplies CRON_SECRET as a Bearer token. */
export async function GET(request: Request) {
  const authorization = authorizeRefreshRequest(request, "cron-only");
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  }
  return executeMetaRefresh();
}
