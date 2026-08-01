"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Customer = {
  id?: string;
  name: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  trn_number: string | null;
  source: string | null;
  notes: string | null;
};

export default function CustomerForm({ customer }: { customer?: Customer }) {
  const router = useRouter();
  const supabase = createClient();
  const isEditing = !!customer?.id;

  const [form, setForm] = useState({
    name: customer?.name ?? "",
    company_name: customer?.company_name ?? "",
    phone: customer?.phone ?? "",
    email: customer?.email ?? "",
    address: customer?.address ?? "",
    trn_number: customer?.trn_number ?? "",
    source: customer?.source ?? "",
    notes: customer?.notes ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      name: form.name,
      company_name: form.company_name || null,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      trn_number: form.trn_number || null,
      source: form.source || null,
      notes: form.notes || null,
    };

    if (isEditing) {
      const { error } = await supabase.from("customers").update(payload).eq("id", customer!.id);
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      router.push("/dashboard/customers");
      router.refresh();
    } else {
      const { error } = await supabase.from("customers").insert(payload);
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      router.push("/dashboard/customers");
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!customer?.id) return;
    if (!confirm(`Delete ${customer.name}? This can't be undone.`)) return;

    setDeleting(true);
    const { error } = await supabase.from("customers").delete().eq("id", customer.id);
    setDeleting(false);

    if (error) {
      setError(
        "Couldn't delete — this customer likely has leads, quotations, or jobs linked to them."
      );
      return;
    }
    router.push("/dashboard/customers");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Name *</label>
          <input
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Company Name</label>
          <input
            value={form.company_name}
            onChange={(e) => update("company_name", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Phone</label>
          <input
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-gray-600">Address</label>
          <input
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">TRN / Tax Number</label>
          <input
            value={form.trn_number}
            onChange={(e) => update("trn_number", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Source</label>
          <input
            value={form.source}
            onChange={(e) => update("source", e.target.value)}
            placeholder="Referral, walk-in, website..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-gray-600">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {loading ? "Saving..." : isEditing ? "Save Changes" : "Add Customer"}
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            {deleting ? "Deleting..." : "Delete Customer"}
          </button>
        )}
      </div>
    </form>
  );
}
