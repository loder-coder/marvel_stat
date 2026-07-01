const DEFAULT_BASE_URL = "https://rivalsmeta.com";
const REQUEST_TIMEOUT_MS = 10_000;

export type RivalsMetaPage = {
  html: string;
  sourceUrl: string;
  fetchedAt: Date;
};

function getPublicPageUrl(path: string): string {
  const baseUrl = process.env.RIVALSMETA_BASE_URL?.trim() || DEFAULT_BASE_URL;
  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

async function fetchPublicPage(path: string, label: string, fetcher: typeof fetch): Promise<RivalsMetaPage> {
  const sourceUrl = getPublicPageUrl(path);
  let response: Response;
  try {
    console.info(`[rivalsmeta] Fetching public ${label} HTML for scheduled/admin refresh`);
    response = await fetcher(sourceUrl, {
      headers: { "User-Agent": "HeroMetaDashboard/1.0 (+public-stats-cache)" },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch (error) {
    throw new Error(`RivalsMeta ${label} request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!response.ok) throw new Error(`RivalsMeta ${label} returned HTTP ${response.status}`);
  const html = await response.text();
  if (!html.trim()) throw new Error(`RivalsMeta ${label} returned an empty document`);
  return { html, sourceUrl, fetchedAt: new Date() };
}

/** Fetches only RivalsMeta's public tier-list HTML without browser impersonation or bypass behavior. */
export function fetchRivalsMetaTierList(fetcher: typeof fetch = fetch): Promise<RivalsMetaPage> {
  return fetchPublicPage("/tier-list", "tier-list", fetcher);
}

/** Fetches only RivalsMeta's public characters statistics HTML. */
export function fetchRivalsMetaCharactersHtml(fetcher: typeof fetch = fetch): Promise<RivalsMetaPage> {
  return fetchPublicPage("/characters", "characters", fetcher);
}
