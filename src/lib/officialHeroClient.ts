import { parseOfficialPayload } from "@/lib/officialHeroParser";

export const OFFICIAL_HERO_PC_URL =
  "https://interact32-z.webapp.easebar.com/x20namwzfysslzs/x20mwzfysslzs_pc_data/";

/** Fetches the official PC Hero Hot List TSV. */
export async function fetchOfficialHeroTsv(
  fetcher: typeof fetch = fetch
): Promise<string> {
  const response = await fetcher(OFFICIAL_HERO_PC_URL, {
    headers: { Accept: "application/json, text/javascript;q=0.9" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000)
  });
  if (!response.ok) throw new Error(`Official Hero Hot List failed (${response.status})`);
  return parseOfficialPayload(await response.text()).data;
}
