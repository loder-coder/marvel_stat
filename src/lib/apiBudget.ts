import { config } from "@/lib/config";
import { getNumber, increment } from "@/lib/cache";
const day = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
const secondsUntilSeoulMidnight = () => 60 * 60 * 30;
export type BudgetState = { used: number; limit: number; ratio: number; mode: "normal" | "soft" | "hard" };
export async function getBudgetState(): Promise<BudgetState> {
  const used = await getNumber(`marvel:api-budget:${day()}:used`); const ratio = used / config.dailyLimit;
  return { used, limit: config.dailyLimit, ratio, mode: ratio >= config.hardRatio ? "hard" : ratio >= config.softRatio ? "soft" : "normal" };
}
export async function reserveApiCall() { const state = await getBudgetState(); if (state.mode === "hard" || state.used >= state.limit) return { allowed: false, state }; const used = await increment(`marvel:api-budget:${day()}:used`, secondsUntilSeoulMidnight()); return { allowed: true, state: { ...state, used } }; }
