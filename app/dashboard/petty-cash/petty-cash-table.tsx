"use client";

import { formatCurrency } from "@/lib/constants";

type LedgerRow = {
  id: string;
  date: string;
  label: string;
  detail: string | null;
  amount: number;
  kind: "daily_sales" | "top_up" | "expense";
  balance: number;
};

const kindColors: Record<string, string> = {
  daily_sales: "bg-green-50 text-green-700",
  top_up: "bg-brand-50 text-brand-700",
  expense: "bg-magenta-50 text-magenta-600",
};

export default function PettyCashTable({ ledger }: { ledger: LedgerRow[] }) {
  // Most recent first for display, balance already computed chronologically
  const displayRows = [...ledger].reverse();

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200/70 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-gray-800">Ledger</h2>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-2">Date</th>
            <th className="px-4 py-2">Type</th>
            <th className="px-4 py-2">Detail</th>
            <th className="px-4 py-2 text-right">Amount</th>
            <th className="px-4 py-2 text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          {displayRows.length > 0 ? (
            displayRows.map((row) => (
              <tr key={row.id} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2 text-gray-500">
                  {new Date(row.date).toLocaleDateString()}
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${kindColors[row.kind]}`}>
                    {row.label}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-500">{row.detail ?? "—"}</td>
                <td
                  className={`px-4 py-2 text-right tabular-nums font-medium ${
                    row.amount >= 0 ? "text-green-700" : "text-magenta-600"
                  }`}
                >
                  {row.amount >= 0 ? "+" : ""}
                  {formatCurrency(row.amount)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums font-semibold text-ink-900">
                  {formatCurrency(row.balance)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                No petty cash activity yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
