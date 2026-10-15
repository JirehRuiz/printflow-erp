"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, FUND_SOURCES, FUND_STYLES } from "@/lib/constants";

type LedgerRow = {
  id: string;
  rawId: string;
  date: string;
  fund: string;
  label: string;
  detail: string | null;
  amount: number;
  kind: "in" | "expense";
  balance: number; // running balance of THIS row's fund after the transaction
};

export default function PettyCashTable({ ledger }: { ledger: LedgerRow[] }) {
  const router = useRouter();
  const supabase = createClient();

  const [fundFilter, setFundFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fund, setFund] = useState<string>(FUND_SOURCES[0]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Most recent first for display
  const displayRows = [...ledger]
    .reverse()
    .filter((r) => !fundFilter || r.fund === fundFilter);

  function startEdit(row: LedgerRow) {
    setEditingId(row.id);
    setFund(row.fund);
    setAmount(String(Math.abs(row.amount)));
    setDate(row.date);
    setDescription(row.detail ?? "");
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  async function saveEdit(row: LedgerRow) {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setLoading(true);

    const { error } = await supabase
      .from("petty_cash_transactions")
      .update({
        fund_name: fund,
        transaction_type: fund === "Daily Sales" ? "daily_sales" : "top_up",
        amount: amt,
        transaction_date: date,
        description: description || null,
      })
      .eq("id", row.rawId);

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  async function remove(row: LedgerRow) {
    if (!confirm(`Delete this ${formatCurrency(row.amount)} entry from ${row.fund}?`)) return;
    await supabase.from("petty_cash_transactions").delete().eq("id", row.rawId);
    router.refresh();
  }

  const fundBadge = (name: string) => (
    <span
      className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        FUND_STYLES[name]?.badge ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {name}
    </span>
  );

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200/70 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-gray-800">Ledger</h2>
        <select
          value={fundFilter}
          onChange={(e) => setFundFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-2 py-1 text-xs"
        >
          <option value="">All funds</option>
          {FUND_SOURCES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-2">Date</th>
            <th className="px-4 py-2">Fund</th>
            <th className="px-4 py-2">Detail</th>
            <th className="px-4 py-2 text-right">Amount</th>
            <th className="px-4 py-2 text-right">Fund Balance</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {displayRows.length > 0 ? (
            displayRows.map((row) =>
              editingId === row.id ? (
                <tr key={row.id} className="border-b border-gray-50 bg-gray-50 last:border-0">
                  <td className="px-4 py-2">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full rounded border border-gray-300 px-1.5 py-1 text-xs"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={fund}
                      onChange={(e) => setFund(e.target.value)}
                      className="w-full rounded border border-gray-300 px-1.5 py-1 text-xs"
                    >
                      {FUND_SOURCES.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full rounded border border-gray-300 px-1.5 py-1 text-xs"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-24 rounded border border-gray-300 px-1.5 py-1 text-right text-xs"
                    />
                  </td>
                  <td className="px-4 py-2 text-right text-gray-300">—</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => saveEdit(row)}
                        disabled={loading}
                        className="text-xs font-medium text-brand-600 hover:underline disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-xs font-medium text-gray-400 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-500">
                    {new Date(row.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">{fundBadge(row.fund)}</td>
                  <td className="px-4 py-2 text-gray-500">
                    <span className="text-xs text-gray-400">{row.label}</span>
                    {row.detail && <p className="text-gray-600">{row.detail}</p>}
                  </td>
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
                  <td className="px-4 py-2 text-right">
                    {row.kind === "expense" ? (
                      <a
                        href="/dashboard/finance?tab=expenses"
                        className="whitespace-nowrap text-xs font-medium text-gray-400 hover:text-brand-600 hover:underline"
                      >
                        Edit in Expenses →
                      </a>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => startEdit(row)}
                          className="text-xs font-medium text-brand-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => remove(row)}
                          className="text-xs font-medium text-magenta-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            )
          ) : (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                No activity yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {error && (
        <p className="border-t border-gray-100 bg-magenta-50 px-4 py-2 text-xs text-magenta-600">
          {error}
        </p>
      )}
    </div>
  );
}
