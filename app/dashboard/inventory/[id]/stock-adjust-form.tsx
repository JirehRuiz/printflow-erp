"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function StockAdjustForm({
  inventoryItemId,
  unit,
}: {
  inventoryItemId: string;
  unit: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [type, setType] = useState<"stock_in" | "stock_out" | "adjustment">("stock_in");
  const [quantity, setQuantity] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const qty = parseFloat(quantity);
    if (!qty || qty === 0) {
      setError("Enter a non-zero quantity.");
      return;
    }

    setLoading(true);

    // stock_out always reduces, stock_in always increases, adjustment
    // uses the sign the user actually typed
    const signedQty =
      type === "stock_out" ? -Math.abs(qty) : type === "stock_in" ? Math.abs(qty) : qty;

    const { error } = await supabase.from("stock_movements").insert({
      inventory_item_id: inventoryItemId,
      movement_type: type,
      quantity_change: signedQty,
      reference: reference || null,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setQuantity("");
    setReference("");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-gray-200/70 bg-white p-5 shadow-sm"
    >
      <h2 className="mb-3 text-sm font-semibold text-gray-800">Adjust Stock</h2>

      <label className="mb-1 block text-xs font-medium text-gray-600">Type</label>
      <select
        value={type}
        onChange={(e) => setType(e.target.value as any)}
        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
      >
        <option value="stock_in">Stock In (received)</option>
        <option value="stock_out">Stock Out (used/damaged)</option>
        <option value="adjustment">Adjustment (count correction, +/-)</option>
      </select>

      <label className="mb-1 mt-3 block text-xs font-medium text-gray-600">
        Quantity ({unit}){type === "adjustment" ? " — use negative to reduce" : ""}
      </label>
      <input
        type="number"
        step="0.01"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
      />

      <label className="mb-1 mt-3 block text-xs font-medium text-gray-600">
        Reference (optional)
      </label>
      <input
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        placeholder="e.g. PO #123, Job JO-2026-0004"
        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
      />

      {error && (
        <p className="mt-3 rounded-lg bg-magenta-50 px-3 py-2 text-xs text-magenta-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-4 w-full rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-ink-950 hover:bg-brand-600 hover:text-white disabled:opacity-60"
      >
        {loading ? "Saving..." : "Record Movement"}
      </button>
    </form>
  );
}
