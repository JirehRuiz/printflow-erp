import Link from "next/link";
import { ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/constants";

type DayBar = { label: string; amount: number };

export default function WeeklySnapshotCard({
  leadsStat,
  quotesStat,
  dailyRevenue,
}: {
  leadsStat: { thisWeek: number; pct: number | null };
  quotesStat: { thisWeek: number; pct: number | null };
  dailyRevenue: DayBar[];
}) {
  const maxAmount = Math.max(...dailyRevenue.map((d) => d.amount), 1);

  return (
    <div className="group relative w-full max-w-sm overflow-hidden rounded-xl bg-ink-950 p-4 shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-brand-500/20">
      {/* Gradient glow border */}
      <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-brand-500 via-brand-600 to-magenta-500 opacity-20 blur-sm transition-opacity duration-300 group-hover:opacity-30" />
      <div className="pointer-events-none absolute inset-px rounded-[11px] bg-ink-950" />

      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700">
              <TrendingUp className="h-4 w-4 text-white" strokeWidth={2} />
            </div>
            <h3 className="text-sm font-semibold text-white">Weekly Snapshot</h3>
          </div>

          <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Live
          </span>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-white/5 p-3">
            <p className="text-xs font-medium text-gray-400">New Leads</p>
            <p className="text-lg font-semibold text-white">{leadsStat.thisWeek}</p>
            {leadsStat.pct !== null && (
              <span
                className={`flex items-center gap-0.5 text-xs font-medium ${
                  leadsStat.pct >= 0 ? "text-emerald-400" : "text-magenta-400"
                }`}
              >
                {leadsStat.pct >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {Math.abs(leadsStat.pct)}%
              </span>
            )}
          </div>

          <div className="rounded-lg bg-white/5 p-3">
            <p className="text-xs font-medium text-gray-400">Quotes Sent</p>
            <p className="text-lg font-semibold text-white">{quotesStat.thisWeek}</p>
            {quotesStat.pct !== null && (
              <span
                className={`flex items-center gap-0.5 text-xs font-medium ${
                  quotesStat.pct >= 0 ? "text-emerald-400" : "text-magenta-400"
                }`}
              >
                {quotesStat.pct >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {Math.abs(quotesStat.pct)}%
              </span>
            )}
          </div>
        </div>

        <div className="mb-4 h-24 w-full overflow-hidden rounded-lg bg-white/5 p-3">
          <div className="flex h-full w-full items-end justify-between gap-1">
            {dailyRevenue.map((day, i) => {
              const heightPct = Math.max((day.amount / maxAmount) * 100, 6);
              return (
                <div key={i} className="group/bar relative flex h-full flex-1 items-end">
                  <div
                    className="w-full rounded-sm bg-brand-500/25 transition-all duration-300"
                    style={{ height: "100%" }}
                  >
                    <div
                      className="w-full rounded-sm bg-gradient-to-t from-brand-500 to-brand-400 transition-all duration-300"
                      style={{ height: `${heightPct}%`, marginTop: `${100 - heightPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-400">Last 7 days</span>
          <Link
            href="/dashboard"
            className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-brand-500 to-brand-700 px-3 py-1 text-xs font-medium text-white transition-all duration-300 hover:from-brand-600 hover:to-brand-800"
          >
            View Overview
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
