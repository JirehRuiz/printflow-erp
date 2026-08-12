"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PettyCashForm() {
  const router = useRouter();
  const supabase = createClient();

  const [type, setType] = useState<"daily_sales" | "top_up">("daily_sales");
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
      transaction_type: type,
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
      <h2 className="mb-3 text-sm font-semibold text-gray-800">Log Cash In</h2>

      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setType("daily_sales")}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${
            type === "daily_sales"
              ? "bg-brand-500 text-white"
              : "border border-gray-300 text-gray-500"
          }`}
        >
          Daily Sales
        </button>
        <button
          type="button"
          onClick={() => setType("top_up")}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${
            type === "top_up"
              ? "bg-brand-500 text-white"
              : "border border-gray-300 text-gray-500"
          }`}
        >
          Top-up / Add Funds
        </button>
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
        {type === "daily_sales" ? "Notes (optional)" : "Source (e.g. Owner deposit)"}
      </label>
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={type === "daily_sales" ? "e.g. Counter sales" : "e.g. Owner deposit, bank withdrawal"}
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
        {loading ? "Saving..." : `+ Add ${type === "daily_sales" ? "Daily Sales" : "Top-up"}`}
      </button>

      <p className="mt-3 text-xs text-gray-400">
        Spending from petty cash? Log it as an expense with{" "}
        <span className="font-medium text-gray-600">Source of Fund = Petty Cash</span> on the
        Expenses page — it'll show up here automatically.
      </p>
    </form>
  );
}
