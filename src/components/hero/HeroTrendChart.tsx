"use client";

import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { localizeTier } from "@/lib/localize";
import ko from "@/locales/ko.json";

type HistoryPoint = { date: string; winRate: number; metaScore: number; metaTier: string };
type HistoryDelta = {
  winRate: number;
  metaScore: number;
  tierChanged: boolean;
  previousTier: string;
  latestTier: string;
} | null;
type HistoryResponse = {
  hero: string;
  rankFilter: string;
  season: string;
  data: HistoryPoint[];
  delta: HistoryDelta;
};

function signed(value: number, suffix: string): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}${suffix}`;
}

function shortDate(value: unknown): string {
  return String(value ?? "").slice(5).replace("-", ".");
}

export function HeroTrendChart({ hero, rankFilter, season }: { hero: string; rankFilter: string; season: string }) {
  const [state, setState] = useState<
    { status: "loading" } | { status: "error" } | { status: "ready"; value: HistoryResponse }
  >({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    const query = new URLSearchParams({ hero, rankFilter, season, days: "30" });
    fetch(`/api/heroes/history?${query}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`History API failed (${response.status})`);
        return response.json() as Promise<HistoryResponse>;
      })
      .then((value) => setState({ status: "ready", value }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ status: "error" });
      });
    return () => controller.abort();
  }, [hero, rankFilter, season]);

  return (
    <section className="trend-section">
      <div className="trend-heading"><div><h3>{ko.history.title}</h3><p>{ko.history.days30}</p></div></div>
      {state.status === "loading" && <p className="trend-state">{ko.history.loading}</p>}
      {state.status === "error" && <p className="trend-state is-error">{ko.history.error}</p>}
      {state.status === "ready" && (
        <>
          {state.value.data.length > 0 && (
            <div className="trend-summary">
              <span>{ko.history.currentWinRate}<strong>{state.value.data.at(-1)?.winRate.toFixed(2)}%</strong></span>
              <span>{ko.history.winRateDelta}<strong>{state.value.delta ? signed(state.value.delta.winRate, "%p") : "—"}</strong></span>
              <span>{ko.history.metaScoreDelta}<strong>{state.value.delta ? signed(state.value.delta.metaScore, "") : "—"}</strong></span>
            </div>
          )}
          {state.value.data.length < 2 ? (
            <p className="trend-state">{ko.history.notEnoughData}</p>
          ) : (
            <>
              <p className="chart-label">{ko.history.winRateTrend}</p>
              <div className="trend-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={state.value.data}>
                    <CartesianGrid stroke="#2a2d35" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: "#858c98", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fill: "#858c98", fontSize: 9 }} width={28} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#181a1f", border: "1px solid #383c46", fontSize: 11 }} labelFormatter={shortDate} />
                    <Line type="monotone" dataKey="winRate" name={ko.history.winRateTrend} stroke="#e62429" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="chart-label">{ko.history.metaScoreTrend}</p>
              <div className="trend-chart compact">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={state.value.data}>
                    <CartesianGrid stroke="#2a2d35" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: "#858c98", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fill: "#858c98", fontSize: 9 }} width={28} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#181a1f", border: "1px solid #383c46", fontSize: 11 }} labelFormatter={shortDate} />
                    <Line type="monotone" dataKey="metaScore" name={ko.history.metaScoreTrend} stroke="#d58a38" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {state.value.delta?.tierChanged && (
                <p className="tier-change">{ko.history.tierChanged}: {localizeTier(state.value.delta.previousTier)} → {localizeTier(state.value.delta.latestTier)}</p>
              )}
            </>
          )}
          <p className="trend-source">{ko.history.sourceNotice}</p>
        </>
      )}
    </section>
  );
}
