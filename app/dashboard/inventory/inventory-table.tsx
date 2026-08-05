"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UNITS } from "@/lib/constants";

type Supplier = { id: string; name: string };

type InventoryItem = {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  quantity_on_hand: number;
  reorder_level: number;
  unit_cost: number;
  supplier_id: string | null;
  is_active: boolean;
  suppliers: { name: string } | { name: string }[] | null;
};

const emptyForm = {
  name: "",
  category: "",
  unit: "pcs",
  reorder_level: "0",
  unit_cost: "0",
  supplier_id: "",
};

function supplierName(s: InventoryItem["suppliers"]) {
  if (!s) return null;
  return Array.isArray(s) ? s[0]?.name : s.name;
}

export default function InventoryTable({
  items,
  suppliers,
  canSeeCost,
  canEdit,
  canDelete,
}: {
  items: InventoryItem[];
  suppliers: Supplier[];
  canSeeCost: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [initialStock, setInitialStock] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit(item: InventoryItem) {
    setShowNewForm(false);
    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category ?? "",
      unit: item.unit,
      reorder_level: String(item.reorder_level),
      unit_cost: String(item.unit_cost),
      supplier_id: item.supplier_id ?? "",
    });
  }

  function startNew() {
    setEditingId(null);
    setShowNewForm(true);
    setForm(emptyForm);
    setInitialStock("0");
  }

  function cancel() {
    setEditingId(null);
    setShowNewForm(false);
    setError(null);
  }

  async function save() {
    if (!form.name) {
      setError("Item name is required.");
      return;
    }
    setError(null);
    setLoading(true);

    const payload = {
      name: form.name,
      category: form.category || null,
      unit: form.unit,
      reorder_level: parseFloat(form.reorder_level) || 0,
      unit_cost: parseFloat(form.unit_cost) || 0,
      supplier_id: form.supplier_id || null,
    };

    if (editingId) {
      const { error } = await supabase.from("inventory_items").update(payload).eq("id", editingId);
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
    } else {
      const { data: newItem, error } = await supabase
        .from("inventory_items")
        .insert(payload)
        .select()
        .single();

      if (error || !newItem) {
        setLoading(false);
        setError(error?.message ?? "Failed to create item.");
        return;
      }

      // Log the starting stock as the first movement, if any was given
      const startQty = parseFloat(initialStock) || 0;
      if (startQty > 0) {
        await supabase.from("stock_movements").insert({
          inventory_item_id: newItem.id,
          movement_type: "stock_in",
          quantity_change: startQty,
          reference: "Initial stock",
        });
      }
      setLoading(false);
    }

    cancel();
    router.refresh();
  }

  async function toggleActive(item: InventoryItem) {
    await supabase.from("inventory_items").update({ is_active: !item.is_active }).eq("id", item.id);
    router.refresh();
  }

  async function remove(item: InventoryItem) {
    if (!confirm(`Delete "${item.name}"? This removes its full stock history too.`)) return;
    const { error } = await supabase.from("inventory_items").delete().eq("id", item.id);
    if (error) {
      alert("Couldn't delete this item.");
      return;
    }
    router.refresh();
  }

  const isFormOpen = showNewForm || !!editingId;

  return (
    <div>
      {canEdit && !isFormOpen && (
        <button
          onClick={startNew}
          className="mb-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-brand-600 hover:text-white"
        >
          + Add Inventory Item
        </button>
      )}

      {isFormOpen && (
        <div className="mb-4 rounded-xl border border-gray-200/70 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-800">
            {editingId ? "Edit Item" : "New Inventory Item"}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Vinyl Gloss - White"
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Category</label>
              <input
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="e.g. Vinyl"
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Unit</label>
              <select
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
                <option value="roll">roll</option>
                <option value="liter">liter</option>
                <option value="kg">kg</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Reorder Level</label>
              <input
                type="number"
                step="0.01"
                value={form.reorder_level}
                onChange={(e) => setForm((f) => ({ ...f, reorder_level: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            {canSeeCost && (
              <div>
                <label className="mb-1 block text-xs font-medium text-magenta-600">
                  Unit Cost
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.unit_cost}
                  onChange={(e) => setForm((f) => ({ ...f, unit_cost: e.target.value }))}
                  className="w-full rounded-lg border border-magenta-500/30 bg-magenta-50/30 px-2 py-1.5 text-sm"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Supplier</label>
              <select
                value={form.supplier_id}
                onChange={(e) => setForm((f) => ({ ...f, supplier_id: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="">None</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            {!editingId && (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Starting Stock
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={initialStock}
                  onChange={(e) => setInitialStock(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
            )}
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-magenta-50 px-3 py-2 text-xs text-magenta-600">{error}</p>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={save}
              disabled={loading}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-brand-600 hover:text-white disabled:opacity-60"
            >
              {loading ? "Saving..." : editingId ? "Save Changes" : "Add Item"}
            </button>
            <button
              onClick={cancel}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
          {!editingId && (
            <p className="mt-2 text-xs text-gray-400">
              Stock adjustments after creation happen on the item's detail page (click into it from
              the list), so every change stays logged in its history.
            </p>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200/70 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">On Hand</th>
              <th className="px-4 py-3">Reorder At</th>
              {canSeeCost && <th className="px-4 py-3">Unit Cost</th>}
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Status</th>
              {canEdit && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item) => {
                const isLow = item.quantity_on_hand <= item.reorder_level;
                return (
                  <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/inventory/${item.id}`}
                        className="font-medium text-gray-800 hover:text-brand-600 hover:underline"
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.category ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`tabular-nums font-medium ${
                          isLow ? "text-magenta-600" : "text-gray-700"
                        }`}
                      >
                        {item.quantity_on_hand} {item.unit}
                      </span>
                      {isLow && <span className="ml-1 text-xs text-magenta-500">⚠ low</span>}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-gray-500">
                      {item.reorder_level} {item.unit}
                    </td>
                    {canSeeCost && (
                      <td className="px-4 py-3 tabular-nums text-gray-500">
                        {item.unit_cost.toFixed(2)}
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-500">{supplierName(item.suppliers) ?? "—"}</td>
                    <td className="px-4 py-3">
                      {canEdit ? (
                        <button
                          onClick={() => toggleActive(item)}
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            item.is_active
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {item.is_active ? "Active" : "Inactive"}
                        </button>
                      ) : (
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            item.is_active
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {item.is_active ? "Active" : "Inactive"}
                        </span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => startEdit(item)}
                            className="text-xs font-medium text-brand-600 hover:underline"
                          >
                            Edit
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => remove(item)}
                              className="text-xs font-medium text-magenta-600 hover:underline"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  No inventory items yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
