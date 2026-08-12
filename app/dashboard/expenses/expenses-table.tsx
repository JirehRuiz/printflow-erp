"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, FUND_SOURCES, formatCurrency } from "@/lib/constants";

type Supplier = { id: string; name: string };

type Expense = {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  expense_date: string;
  payment_method: string | null;
  source_of_fund: string | null;
  supplier_id: string | null;
  receipt_reference: string | null;
  notes: string | null;
  suppliers: { name: string } | { name: string }[] | null;
};

const emptyForm = {
  category: "",
  description: "",
  amount: "",
  expense_date: new Date().toISOString().split("T")[0],
  payment_method: "cash",
  source_of_fund: "",
  supplier_id: "",
  receipt_reference: "",
  notes: "",
};

function supplierName(s: Expense["suppliers"]) {
  if (!s) return null;
  return Array.isArray(s) ? s[0]?.name : s.name;
}

export default function ExpensesTable({
  expenses,
  suppliers,
}: {
  expenses: Expense[];
  suppliers: Supplier[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [categoryFilter, setCategoryFilter] = useState("");
  const [fundSourceFilter, setFundSourceFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      expenses.filter(
        (e) =>
          (!categoryFilter || e.category === categoryFilter) &&
          (!fundSourceFilter || e.source_of_fund === fundSourceFilter)
      ),
    [expenses, categoryFilter, fundSourceFilter]
  );

  const categories = useMemo(
    () => Array.from(new Set(expenses.map((e) => e.category))).sort(),
    [expenses]
  );

  const fundSources = useMemo(
    () => Array.from(new Set(expenses.map((e) => e.source_of_fund).filter(Boolean))).sort() as string[],
    [expenses]
  );

  const totalShown = filtered.reduce((sum, e) => sum + e.amount, 0);

  function startNew() {
    setEditingId(null);
    setShowForm(true);
    setForm(emptyForm);
  }

  function startEdit(e: Expense) {
    setEditingId(e.id);
    setShowForm(true);
    setForm({
      category: e.category,
      description: e.description ?? "",
      amount: String(e.amount),
      expense_date: e.expense_date,
      payment_method: e.payment_method ?? "cash",
      source_of_fund: e.source_of_fund ?? "",
      supplier_id: e.supplier_id ?? "",
      receipt_reference: e.receipt_reference ?? "",
      notes: e.notes ?? "",
    });
  }

  function cancel() {
    setShowForm(false);
    setEditingId(null);
    setError(null);
  }

  async function save() {
    if (!form.category || !form.amount) {
      setError("Category and amount are required.");
      return;
    }
    setError(null);
    setLoading(true);

    const payload = {
      category: form.category,
      description: form.description || null,
      amount: parseFloat(form.amount) || 0,
      expense_date: form.expense_date,
      payment_method: form.payment_method || null,
      source_of_fund: form.source_of_fund || null,
      supplier_id: form.supplier_id || null,
      receipt_reference: form.receipt_reference || null,
      notes: form.notes || null,
    };

    const { error } = editingId
      ? await supabase.from("expenses").update(payload).eq("id", editingId)
      : await supabase.from("expenses").insert(payload);

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    cancel();
    router.refresh();
  }

  async function remove(e: Expense) {
    if (!confirm(`Delete this ${e.category} expense of ${formatCurrency(e.amount)}?`)) return;
    await supabase.from("expenses").delete().eq("id", e.id);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {fundSources.length > 0 && (
          <select
            value={fundSourceFilter}
            onChange={(e) => setFundSourceFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All fund sources</option>
            {fundSources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}

        {!showForm && (
          <button
            onClick={startNew}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-brand-600 hover:text-white"
          >
            + Add Expense
          </button>
        )}

        <span className="ml-auto text-sm text-gray-400">
          {filtered.length} expense{filtered.length !== 1 ? "s" : ""} · {formatCurrency(totalShown)}
        </span>
      </div>

      {showForm && (
        <div className="mb-4 rounded-xl border border-gray-200/70 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-800">
            {editingId ? "Edit Expense" : "New Expense"}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Category *</label>
              <input
                list="expense-categories"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="e.g. Rent"
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
              <datalist id="expense-categories">
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Amount *</label>
              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Date</label>
              <input
                type="date"
                value={form.expense_date}
                onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="e.g. October office rent"
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Payment Method</label>
              <select
                value={form.payment_method}
                onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Source of Fund</label>
              <input
                list="fund-sources"
                value={form.source_of_fund}
                onChange={(e) => setForm((f) => ({ ...f, source_of_fund: e.target.value }))}
                placeholder="e.g. Petty Cash"
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
              <datalist id="fund-sources">
                {FUND_SOURCES.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Supplier (optional)
              </label>
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
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Receipt Reference
              </label>
              <input
                value={form.receipt_reference}
                onChange={(e) => setForm((f) => ({ ...f, receipt_reference: e.target.value }))}
                placeholder="e.g. Receipt #1234"
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
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
              {loading ? "Saving..." : editingId ? "Save Changes" : "Add Expense"}
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
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Source of Fund</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((e) => (
                <tr key={e.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(e.expense_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {e.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{e.description ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{supplierName(e.suppliers) ?? "—"}</td>
                  <td className="px-4 py-3 capitalize text-gray-500">
                    {e.payment_method?.replace("_", " ") ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {e.source_of_fund ? (
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                        {e.source_of_fund}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums font-medium text-gray-800">
                    {formatCurrency(e.amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => startEdit(e)}
                        className="text-xs font-medium text-brand-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(e)}
                        className="text-xs font-medium text-magenta-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  No expenses recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
