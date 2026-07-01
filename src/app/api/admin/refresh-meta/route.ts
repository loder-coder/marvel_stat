import { NextResponse } from "next/server";
import { authorizeRefreshRequest } from "@/lib/refreshAuth";
import { executeMetaRefresh } from "@/lib/refreshMetaEndpoint";

/** Manual refresh endpoint. Query tokens remain available only for legacy compatibility. */
export async function POST(request: Request) {
  const authorization = authorizeRefreshRequest(request, "admin-or-cron");
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  }
  return executeMetaRefresh();
}
