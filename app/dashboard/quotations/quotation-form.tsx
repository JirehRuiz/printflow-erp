"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PRODUCT_TYPES, UNITS, formatCurrency } from "@/lib/constants";

type Customer = { id: string; name: string; company_name: string | null };

type CatalogItem = {
  id: string;
  product_type: string;
  name: string;
  description: string;
  material: string | null;
  unit: string;
  selling_price: number;
};

type LineItem = {
  product_type: string;
  description: string;
  material: string;
  width: string;
  height: string;
  unit: string;
  qty: string;
  unit_price: string;
  catalog_item_id: string;
};

const emptyItem = (): LineItem => ({
  product_type: "digital_printing",
  description: "",
  material: "",
  width: "",
  height: "",
  unit: "pcs",
  qty: "1",
  unit_price: "0",
  catalog_item_id: "",
});

type ExistingQuotation = {
  id: string;
  customer_id: string;
  valid_until: string | null;
  tax_percent: number;
  discount: number;
  terms: string | null;
  items: LineItem[];
};

export default function QuotationForm({
  customers,
  catalogItems = [],
  existingQuotation,
}: {
  customers: Customer[];
  catalogItems?: CatalogItem[];
  existingQuotation?: ExistingQuotation;
}) {
  const router = useRouter();
  const supabase = createClient();
  const isEditing = !!existingQuotation;

  const [customerId, setCustomerId] = useState(existingQuotation?.customer_id ?? "");
  const [validUntil, setValidUntil] = useState(existingQuotation?.valid_until ?? "");
  const [taxPercent, setTaxPercent] = useState(String(existingQuotation?.tax_percent ?? 5));
  const [discount, setDiscount] = useState(String(existingQuotation?.discount ?? 0));
  const [terms, setTerms] = useState(
    existingQuotation?.terms ?? "50% advance, balance on delivery."
  );
  const [items, setItems] = useState<LineItem[]>(
    existingQuotation?.items && existingQuotation.items.length > 0
      ? existingQuotation.items
      : [emptyItem()]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + (parseFloat(item.qty) || 0) * (parseFloat(item.unit_price) || 0),
        0
      ),
    [items]
  );
  const discountAmount = parseFloat(discount) || 0;
  const taxable = Math.max(subtotal - discountAmount, 0);
  const taxAmount = taxable * ((parseFloat(taxPercent) || 0) / 100);
  const total = taxable + taxAmount;

  function updateItem(index: number, field: keyof LineItem, value: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function applyCatalogItem(index: number, catalogItemId: string) {
    if (!catalogItemId) {
      // "Custom" selected — clear the link but leave any typed values as-is
      updateItem(index, "catalog_item_id", "");
      return;
    }
    const match = catalogItems.find((c) => c.id === catalogItemId);
    if (!match) return;

    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              catalog_item_id: catalogItemId,
              description: match.description,
              material: match.material ?? "",
              unit: match.unit,
              unit_price: String(match.selling_price),
            }
          : item
      )
    );
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!customerId) {
      setError("Please select a customer.");
      return;
    }
    if (items.length === 0) {
      setError("Add at least one line item.");
      return;
    }

    setLoading(true);

    if (isEditing) {
      const { error: updateError } = await supabase
        .from("quotations")
        .update({
          customer_id: customerId,
          valid_until: validUntil || null,
          subtotal,
          discount: discountAmount,
          tax_percent: parseFloat(taxPercent) || 0,
          tax_amount: taxAmount,
          total,
          terms,
        })
        .eq("id", existingQuotation!.id);

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      // Simplest reliable sync: clear old items, insert current set
      await supabase
        .from("quotation_items")
        .delete()
        .eq("quotation_id", existingQuotation!.id);

      const itemRows = items.map((item, index) => ({
        quotation_id: existingQuotation!.id,
        product_type: item.product_type,
        description: item.description,
        material: item.material || null,
        width: item.width ? parseFloat(item.width) : null,
        height: item.height ? parseFloat(item.height) : null,
        unit: item.unit,
        qty: parseFloat(item.qty) || 0,
        unit_price: parseFloat(item.unit_price) || 0,
        sort_order: index,
      }));

      const { error: itemsError } = await supabase.from("quotation_items").insert(itemRows);
      setLoading(false);

      if (itemsError) {
        setError(itemsError.message);
        return;
      }

      router.push(`/dashboard/quotations/${existingQuotation!.id}`);
      router.refresh();
      return;
    }

    const { data: quotation, error: quoteError } = await supabase
      .from("quotations")
      .insert({
        customer_id: customerId,
        valid_until: validUntil || null,
        subtotal,
        discount: discountAmount,
        tax_percent: parseFloat(taxPercent) || 0,
        tax_amount: taxAmount,
        total,
        terms,
        status: "draft",
      })
      .select()
      .single();

    if (quoteError || !quotation) {
      setError(quoteError?.message ?? "Failed to create quotation.");
      setLoading(false);
      return;
    }

    const itemRows = items.map((item, index) => ({
      quotation_id: quotation.id,
      product_type: item.product_type,
      description: item.description,
      material: item.material || null,
      width: item.width ? parseFloat(item.width) : null,
      height: item.height ? parseFloat(item.height) : null,
      unit: item.unit,
      qty: parseFloat(item.qty) || 0,
      unit_price: parseFloat(item.unit_price) || 0,
      sort_order: index,
    }));

    const { error: itemsError } = await supabase.from("quotation_items").insert(itemRows);

    setLoading(false);

    if (itemsError) {
      setError(itemsError.message);
      return;
    }

    router.push(`/dashboard/quotations/${quotation.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer + validity */}
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Customer</label>
          <select
            required
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">Select customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.company_name ? `(${c.company_name})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Valid Until</label>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Tax %</label>
          <input
            type="number"
            step="0.01"
            value={taxPercent}
            onChange={(e) => setTaxPercent(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Line Items</h2>
          <button
            type="button"
            onClick={addItem}
            className="rounded-lg border border-brand-500 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50"
          >
            + Add Item
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-8">
                <div className="col-span-2 sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-500">Product Type</label>
                  <select
                    value={item.product_type}
                    onChange={(e) => {
                      updateItem(index, "product_type", e.target.value);
                      updateItem(index, "catalog_item_id", "");
                    }}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                  >
                    {PRODUCT_TYPES.map((pt) => (
                      <option key={pt.value} value={pt.value}>
                        {pt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    Catalog Item
                  </label>
                  <select
                    value={item.catalog_item_id}
                    onChange={(e) => applyCatalogItem(index, e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                  >
                    <option value="">Custom (type manually)</option>
                    {catalogItems
                      .filter((c) => c.product_type === item.product_type)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} — {formatCurrency(c.selling_price)}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-500">Description</label>
                  <input
                    required
                    value={item.description}
                    onChange={(e) => updateItem(index, "description", e.target.value)}
                    placeholder="e.g. Flex banner 3x6ft"
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Material</label>
                  <input
                    value={item.material}
                    onChange={(e) => updateItem(index, "material", e.target.value)}
                    placeholder="Flex / Acrylic..."
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Unit</label>
                  <select
                    value={item.unit}
                    onChange={(e) => updateItem(index, "unit", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-6">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Width</label>
                  <input
                    type="number"
                    step="0.01"
                    value={item.width}
                    onChange={(e) => updateItem(index, "width", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Height</label>
                  <input
                    type="number"
                    step="0.01"
                    value={item.height}
                    onChange={(e) => updateItem(index, "height", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Qty</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={item.qty}
                    onChange={(e) => updateItem(index, "qty", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Unit Price</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={item.unit_price}
                    onChange={(e) => updateItem(index, "unit_price", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Line Total</label>
                  <div className="rounded-lg bg-white px-2 py-1.5 text-sm font-medium text-gray-700">
                    {formatCurrency(
                      (parseFloat(item.qty) || 0) * (parseFloat(item.unit_price) || 0)
                    )}
                  </div>
                </div>
                <div className="flex items-end">
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="w-full rounded-lg border border-red-200 px-2 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Terms + totals */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <label className="mb-1 block text-xs font-medium text-gray-600">Terms & Notes</label>
          <textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <label className="mb-1 mt-3 block text-xs font-medium text-gray-600">Discount (flat amount)</label>
          <input
            type="number"
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-800">Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Discount</span>
              <span>- {formatCurrency(discountAmount)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Tax ({taxPercent || 0}%)</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-gray-100 pt-2 text-base font-semibold text-brand-900">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {loading ? "Saving..." : isEditing ? "Save Changes" : "Save Quotation"}
          </button>
        </div>
      </div>
    </form>
  );
}
