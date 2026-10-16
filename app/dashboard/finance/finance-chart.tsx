"use client";

import { useMemo, useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatCurrency } from "@/lib/constants";

type Period = "daily" | "weekly" | "monthly";

export type ChartPoint = {
  date: string; // YYYY-MM-DD
  amount: number; // expenses mode: positive spend. funds mode: signed (+in / -out)
  group: string; // expenses mode: category. funds mode: fund name
};

const PERIODS: { key: Period; label: string; hint: string }[] = [
  { key: "daily", label: "Daily", hint: "Last 30 days" },
  { key: "weekly", label: "Weekly", hint: "Last 12 weeks" },
  { key: "monthly", label: "Monthly", hint: "Last 12 months" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function parseLocal(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfWeek(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Monday
  return x;
}

function bucketKey(dateStr: string, period: Period) {
  const d = parseLocal(dateStr);
  if (period === "daily") return toISO(d);
  if (period === "weekly") return toISO(startOfWeek(d));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

// Builds the full list of buckets for the window, so empty periods still show as zero
function buildBuckets(period: Period) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const buckets: { key: string; label: string; fullLabel: string; startISO: string }[] = [];

  if (period === "daily") {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      buckets.push({
        key: toISO(d),
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        fullLabel: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        startISO: toISO(d),
      });
    }
  } else if (period === "weekly") {
    const thisWeek = startOfWeek(today);
    for (let i = 11; i >= 0; i--) {
      const d = new Date(thisWeek);
      d.setDate(d.getDate() - i * 7);
      buckets.push({
        key: toISO(d),
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        fullLabel: `Week of ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        startISO: toISO(d),
      });
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`,
        label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        fullLabel: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        startISO: toISO(d),
      });
    }
  }
  return buckets;
}

export default function FinanceChart({
  mode,
  data,
  groups,
  groupLabel,
}: {
  mode: "expenses" | "funds";
  data: ChartPoint[];
  groups: string[];
  groupLabel: string; // e.g. "category" / "fund"
}) {
  const [period, setPeriod] = useState<Period>("daily");
  const [group, setGroup] = useState("");

  const { series, totals } = useMemo(() => {
    const buckets = buildBuckets(period);
    const filtered = group ? data.filter((p) => p.group === group) : data;

    const map: Record<string, { in: number; out: number }> = {};
    buckets.forEach((b) => (map[b.key] = { in: 0, out: 0 }));

    filtered.forEach((p) => {
      const k = bucketKey(p.date, period);
      if (!map[k]) return; // outside the window
      if (mode === "expenses") map[k].out += p.amount;
      else if (p.amount >= 0) map[k].in += p.amount;
      else map[k].out += Math.abs(p.amount);
    });

    // Funds mode also plots the running balance. Start from everything that
    // happened before the window opens so the line is accurate.
    const windowStart = buckets[0].startISO;
    let balance = filtered.filter((p) => p.date < windowStart).reduce((s, p) => s + p.amount, 0);

    const rows = buckets.map((b) => {
      const v = map[b.key];
      balance += v.in - v.out;
      return {
        label: b.label,
        fullLabel: b.fullLabel,
        in: v.in,
        out: v.out,
        balance,
      };
    });

    const totalIn = rows.reduce((s, r) => s + r.in, 0);
    const totalOut = rows.reduce((s, r) => s + r.out, 0);
    const peak = rows.reduce((best, r) => (r.out > best.out ? r : best), rows[0]);
    const activeBuckets = rows.filter((r) => r.out > 0).length;

    return {
      series: rows,
      totals: {
        in: totalIn,
        out: totalOut,
        net: totalIn - totalOut,
        peak,
        avg: rows.length ? totalOut / rows.length : 0,
        activeBuckets,
        closing: rows[rows.length - 1]?.balance ?? 0,
      },
    };
  }, [data, period, group, mode]);

  const periodMeta = PERIODS.find((p) => p.key === period)!;
  const unit = period === "daily" ? "day" : period === "weekly" ? "week" : "month";

  const seriesLabel = (name: string): string => {
    if (name === "in") return "Money In";
    if (name === "out") return mode === "expenses" ? "Spent" : "Money Out";
    return "Balance";
  };

  return (
    <div className="rounded-xl border border-gray-200/70 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">
            {mode === "expenses" ? "Spending Trend" : "Money In vs Out"}
          </h2>
          <p className="text-xs text-gray-400">{periodMeta.hint}</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
          >
            <option value="">All {groupLabel === "category" ? "categories" : "funds"}</option>
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          <div className="flex rounded-lg bg-gray-100 p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  period === p.key
                    ? "bg-white text-ink-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick stats for the selected window */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {mode === "expenses" ? (
          <>
            <Stat label="Total Spent" value={formatCurrency(totals.out)} tone="magenta" />
            <Stat label={`Avg per ${unit}`} value={formatCurrency(totals.avg)} />
            <Stat
              label={`Highest ${unit}`}
              value={formatCurrency(totals.peak?.out ?? 0)}
              sub={totals.peak?.out ? totals.peak.fullLabel : undefined}
            />
            <Stat label={`Active ${unit}s`} value={`${totals.activeBuckets} / ${series.length}`} />
          </>
        ) : (
          <>
            <Stat label="Total In" value={formatCurrency(totals.in)} tone="green" />
            <Stat label="Total Out" value={formatCurrency(totals.out)} tone="magenta" />
            <Stat
              label="Net Change"
              value={`${totals.net >= 0 ? "+" : ""}${formatCurrency(totals.net)}`}
              tone={totals.net >= 0 ? "green" : "magenta"}
            />
            <Stat
              label="Balance Now"
              value={formatCurrency(totals.closing)}
              tone={totals.closing >= 0 ? "default" : "magenta"}
            />
          </>
        )}
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              interval={period === "daily" ? 4 : 0}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
            />
            <Tooltip
              labelFormatter={(_: any, payload: any) => payload?.[0]?.payload?.fullLabel ?? ""}
              formatter={(value: any, name: any) => [formatCurrency(Number(value)), seriesLabel(String(name))]}
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
            />
            <Legend
              formatter={(v: any) => seriesLabel(String(v))}
              wrapperStyle={{ fontSize: 12 }}
            />
            {mode === "funds" && <Bar dataKey="in" fill="#16a34a" radius={[4, 4, 0, 0]} />}
            <Bar dataKey="out" fill="#D6127E" radius={[4, 4, 0, 0]} />
            {mode === "funds" && (
              <Line type="monotone" dataKey="balance" stroke="#0EA5D6" strokeWidth={2} dot={false} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "green" | "magenta";
}) {
  const color =
    tone === "green" ? "text-green-700" : tone === "magenta" ? "text-magenta-600" : "text-ink-900";
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`tabular-nums text-sm font-semibold ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
    </div>
  );
}
