const DEFAULT_BASE_URL = "https://rivalsmeta.com";
const REQUEST_TIMEOUT_MS = 10_000;

export type RivalsMetaPage = {
  html: string;
  sourceUrl: string;
  fetchedAt: Date;
};

function getTierListUrl(): string {
  const baseUrl = process.env.RIVALSMETA_BASE_URL?.trim() || DEFAULT_BASE_URL;
  return new URL("/tier-list", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

/** Fetches only RivalsMeta's public tier-list HTML without browser impersonation or bypass behavior. */
export async function fetchRivalsMetaTierList(fetcher: typeof fetch = fetch): Promise<RivalsMetaPage> {
  const sourceUrl = getTierListUrl();
  let response: Response;
  try {
    console.info("[rivalsmeta] Fetching public tier-list HTML for scheduled/admin refresh");
    response = await fetcher(sourceUrl, {
      headers: { "User-Agent": "HeroMetaDashboard/1.0 (+public-tier-list-cache)" },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch (error) {
    throw new Error(`RivalsMeta tier list request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!response.ok) throw new Error(`RivalsMeta tier list returned HTTP ${response.status}`);
  const html = await response.text();
  if (!html.trim()) throw new Error("RivalsMeta tier list returned an empty document");
  return { html, sourceUrl, fetchedAt: new Date() };
}
