"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NewLeadForm() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // 1. Create the customer record
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .insert({ name: customerName, phone })
      .select()
      .single();

    if (customerError) {
      setError(customerError.message);
      setLoading(false);
      return;
    }

    // 2. Create the lead, linked to that customer
    const { error: leadError } = await supabase.from("leads").insert({
      title,
      customer_id: customer.id,
      requirement_summary: summary,
      status: "new",
    });

    setLoading(false);

    if (leadError) {
      setError(leadError.message);
      return;
    }

    setTitle("");
    setCustomerName("");
    setPhone("");
    setSummary("");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
    >
      <h2 className="text-sm font-semibold text-gray-800">New Lead</h2>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Lead title
        </label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Vehicle wrap for 3 vans"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Customer name
        </label>
        <input
          required
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="e.g. Al Futtaim Trading"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Phone
        </label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+971 5..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Requirement summary
        </label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          placeholder="Short note on what they need..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
      >
        {loading ? "Saving..." : "Add Lead"}
      </button>
    </form>
  );
}
