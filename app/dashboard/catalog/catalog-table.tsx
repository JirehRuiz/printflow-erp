"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UNITS } from "@/lib/constants";

type ProductType = { value: string; label: string };
type InventoryItemOption = { id: string; name: string; unit: string };

type CatalogItem = {
  id: string;
  product_type: string;
  name: string;
  description: string;
  material: string | null;
  unit: string;
  cost_price: number;
  selling_price: number;
  is_active: boolean;
  inventory_item_id: string | null;
  consumption_per_unit: number | null;
};

const emptyForm = {
  product_type: "",
  name: "",
  description: "",
  material: "",
  unit: "pcs",
  cost_price: "0",
  selling_price: "0",
  inventory_item_id: "",
  consumption_per_unit: "0",
};

export default function CatalogTable({
  items,
  productTypes,
  inventoryItems,
  canSeeCost,
  canEdit,
  canDelete,
  isAdmin,
}: {
  items: CatalogItem[];
  productTypes: readonly ProductType[];
  inventoryItems: InventoryItemOption[];
  canSeeCost: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [filterType, setFilterType] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(
    () => (filterType ? items.filter((i) => i.product_type === filterType) : items),
    [items, filterType]
  );

  function productLabel(value: string) {
    return productTypes.find((p) => p.value === value)?.label ?? value;
  }

  function startEdit(item: CatalogItem) {
    setShowNewForm(false);
    setEditingId(item.id);
    setForm({
      product_type: item.product_type,
      name: item.name,
      description: item.description,
      material: item.material ?? "",
      unit: item.unit,
      cost_price: String(item.cost_price),
      selling_price: String(item.selling_price),
      inventory_item_id: item.inventory_item_id ?? "",
      consumption_per_unit: String(item.consumption_per_unit ?? 0),
    });
  }

  function startNew() {
    setEditingId(null);
    setShowNewForm(true);
    setForm(emptyForm);
  }

  function cancel() {
    setEditingId(null);
    setShowNewForm(false);
    setError(null);
  }

  async function save() {
    if (!form.product_type || !form.name || !form.description) {
      setError("Product type, name, and description are required.");
      return;
    }
    setError(null);
    setLoading(true);

    const payload: Record<string, any> = {
      product_type: form.product_type,
      name: form.name,
      description: form.description,
      material: form.material || null,
      unit: form.unit,
      cost_price: parseFloat(form.cost_price) || 0,
      selling_price: parseFloat(form.selling_price) || 0,
    };

    // Only admins can set/change the inventory linkage
    if (isAdmin) {
      payload.inventory_item_id = form.inventory_item_id || null;
      payload.consumption_per_unit = parseFloat(form.consumption_per_unit) || 0;
    }

    const { error } = editingId
      ? await supabase.from("catalog_items").update(payload).eq("id", editingId)
      : await supabase.from("catalog_items").insert(payload);

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    cancel();
    router.refresh();
  }

  async function toggleActive(item: CatalogItem) {
    await supabase
      .from("catalog_items")
      .update({ is_active: !item.is_active })
      .eq("id", item.id);
    router.refresh();
  }

  async function remove(item: CatalogItem) {
    if (!confirm(`Delete "${item.name}"? This can't be undone.`)) return;
    const { error } = await supabase.from("catalog_items").delete().eq("id", item.id);
    if (error) {
      alert("Couldn't delete — it may be referenced by an existing quotation.");
      return;
    }
    router.refresh();
  }

  const isFormOpen = showNewForm || !!editingId;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All product types</option>
          {productTypes.map((pt) => (
            <option key={pt.value} value={pt.value}>
              {pt.label}
            </option>
          ))}
        </select>

        {canEdit && !isFormOpen && (
          <button
            onClick={startNew}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-brand-600 hover:text-white"
          >
            + Add Catalog Item
          </button>
        )}
      </div>

      {isFormOpen && (
        <div className="mb-4 rounded-xl border border-gray-200/70 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-800">
            {editingId ? "Edit Item" : "New Catalog Item"}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Product Type</label>
              <select
                value={form.product_type}
                onChange={(e) => setForm((f) => ({ ...f, product_type: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="">Select...</option>
                {productTypes.map((pt) => (
                  <option key={pt.value} value={pt.value}>
                    {pt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Item Name (shown in dropdown)
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Vinyl Gloss Sticker"
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Material</label>
              <input
                value={form.material}
                onChange={(e) => setForm((f) => ({ ...f, material: e.target.value }))}
                placeholder="e.g. Vinyl (Gloss)"
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Default Description (used on quotation line item)
              </label>
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Die-cut vinyl sticker, gloss finish"
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
              </select>
            </div>
            {canSeeCost && (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Cost Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.cost_price}
                  onChange={(e) => setForm((f) => ({ ...f, cost_price: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Selling Price</label>
              <input
                type="number"
                step="0.01"
                value={form.selling_price}
                onChange={(e) => setForm((f) => ({ ...f, selling_price: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          {isAdmin && (
            <div className="mt-3 rounded-lg border border-dashed border-gray-200 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Inventory Auto-Deduction (optional)
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Linked Inventory Item
                  </label>
                  <select
                    value={form.inventory_item_id}
                    onChange={(e) => setForm((f) => ({ ...f, inventory_item_id: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                  >
                    <option value="">Not linked — no auto-deduction</option>
                    {inventoryItems.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name} ({inv.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Consumption per {form.unit || "unit"}
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.consumption_per_unit}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, consumption_per_unit: e.target.value }))
                    }
                    placeholder="e.g. 0.05"
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                In the inventory item's own unit. E.g. if this sells per "pcs" and the linked
                inventory item is tracked in "sqm", enter how many sqm one pcs uses.
              </p>
            </div>
          )}

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
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200/70 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Material</th>
              <th className="px-4 py-3">Unit</th>
              {canSeeCost && <th className="px-4 py-3">Cost</th>}
              <th className="px-4 py-3">Selling Price</th>
              {canSeeCost && <th className="px-4 py-3">Margin</th>}
              {isAdmin && <th className="px-4 py-3">Inventory</th>}
              <th className="px-4 py-3">Status</th>
              {canEdit && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((item) => {
                const margin =
                  item.selling_price > 0
                    ? Math.round(((item.selling_price - item.cost_price) / item.selling_price) * 100)
                    : 0;
                return (
                  <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-400">{item.description}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{productLabel(item.product_type)}</td>
                    <td className="px-4 py-3 text-gray-500">{item.material ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{item.unit}</td>
                    {canSeeCost && (
                      <td className="px-4 py-3 tabular-nums text-gray-500">
                        {item.cost_price.toFixed(2)}
                      </td>
                    )}
                    <td className="px-4 py-3 tabular-nums font-medium text-gray-800">
                      {item.selling_price.toFixed(2)}
                    </td>
                    {canSeeCost && (
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            margin >= 40
                              ? "bg-green-50 text-green-700"
                              : margin >= 20
                              ? "bg-amber-50 text-amber-700"
                              : "bg-magenta-50 text-magenta-600"
                          }`}
                        >
                          {margin}%
                        </span>
                      </td>
                    )}
                    {isAdmin && (
                      <td className="px-4 py-3">
                        {item.inventory_item_id ? (
                          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                            🔗 {item.consumption_per_unit}/{item.unit}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    )}
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
                <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                  No catalog items yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
