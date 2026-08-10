"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatCurrency } from "@/lib/constants";

type MonthlyPL = {
  month: string;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
};

const NAME_LABELS: Record<string, string> = {
  cogs: "Cost of Goods",
  expenses: "Operating Expenses",
  netProfit: "Net Profit",
};

export default function ProfitLossChart({ data }: { data: MonthlyPL[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 12, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
          />
          <Tooltip
            formatter={(value: number, name: string) => [formatCurrency(value), NAME_LABELS[name] ?? name]}
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
          />
          <Legend
            formatter={(value) => NAME_LABELS[value] ?? value}
            wrapperStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="cogs" stackId="a" fill="#D6127E" radius={[0, 0, 0, 0]} />
          <Bar dataKey="expenses" stackId="a" fill="#F4C21A" radius={[0, 0, 0, 0]} />
          <Bar dataKey="netProfit" stackId="a" fill="#0EA5D6" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
