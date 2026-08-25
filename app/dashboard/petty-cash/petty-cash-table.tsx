"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/constants";

type LedgerRow = {
  id: string;
  rawId: string;
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
  const router = useRouter();
  const supabase = createClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayRows = [...ledger].reverse();

  function startEdit(row: LedgerRow) {
    setEditingId(row.id);
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
    if (!confirm(`Delete this ${row.label} entry of ${formatCurrency(row.amount)}?`)) return;
    await supabase.from("petty_cash_transactions").delete().eq("id", row.rawId);
    router.refresh();
  }

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
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${kindColors[row.kind]}`}>
                      {row.label}
                    </span>
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
                  <td className="px-4 py-2 text-right">
                    {row.kind === "expense" ? (
                      <a
                        href="/dashboard/finance?tab=expenses"
                        className="text-xs font-medium text-gray-400 hover:text-brand-600 hover:underline"
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
