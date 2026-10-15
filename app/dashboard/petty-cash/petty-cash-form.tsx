"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FUND_SOURCES } from "@/lib/constants";

export default function PettyCashForm() {
  const router = useRouter();
  const supabase = createClient();

  const [fund, setFund] = useState<string>(FUND_SOURCES[0]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("petty_cash_transactions").insert({
      fund_name: fund,
      // legacy column, kept in sync so older data/reports still make sense
      transaction_type: fund === "Daily Sales" ? "daily_sales" : "top_up",
      amount: amt,
      transaction_date: date,
      description: description || null,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setAmount("");
    setDescription("");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-gray-200/70 bg-white p-5 shadow-sm"
    >
      <h2 className="mb-3 text-sm font-semibold text-gray-800">Add Money to a Fund</h2>

      <label className="mb-1 block text-xs font-medium text-gray-600">Fund</label>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {FUND_SOURCES.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFund(f)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${
              fund === f
                ? "bg-brand-500 text-white"
                : "border border-gray-300 text-gray-500 hover:bg-gray-50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <label className="mb-1 block text-xs font-medium text-gray-600">Amount</label>
      <input
        type="number"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />

      <label className="mb-1 mt-3 block text-xs font-medium text-gray-600">Date</label>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />

      <label className="mb-1 mt-3 block text-xs font-medium text-gray-600">
        Notes (optional)
      </label>
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={
          fund === "Daily Sales" ? "e.g. Counter sales" : "e.g. Owner deposit, bank withdrawal"
        }
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />

      {error && (
        <p className="mt-3 rounded-lg bg-magenta-50 px-3 py-2 text-xs text-magenta-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-4 w-full rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
      >
        {loading ? "Saving..." : `+ Add to ${fund}`}
      </button>

      <p className="mt-3 text-xs text-gray-400">
        Spending from a fund? Log it as an expense on the Expenses tab and pick the fund as{" "}
        <span className="font-medium text-gray-600">Source of Fund</span> — it deducts from that
        fund automatically.
      </p>
    </form>
  );
}
