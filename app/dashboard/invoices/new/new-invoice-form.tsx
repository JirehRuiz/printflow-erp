"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/constants";

type JobOption = {
  id: string;
  job_number: string;
  status: string;
  customer_id: string;
  customers: { name: string }[] | null;
  quotations: { total: number; subtotal: number; tax_amount: number }[] | null;
};

export default function NewInvoiceForm({ jobOrders }: { jobOrders: JobOption[] }) {
  const router = useRouter();
  const supabase = createClient();

  const [jobId, setJobId] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [total, setTotal] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedJob = useMemo(() => jobOrders.find((j) => j.id === jobId), [jobOrders, jobId]);

  function handleSelectJob(id: string) {
    setJobId(id);
    const job = jobOrders.find((j) => j.id === id);
    const quotation = job?.quotations?.[0];
    if (quotation) {
      setSubtotal(String(quotation.subtotal));
      setTaxAmount(String(quotation.tax_amount));
      setTotal(String(quotation.total));
    } else {
      setSubtotal("");
      setTaxAmount("");
      setTotal("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!jobId || !selectedJob) {
      setError("Select a job order to invoice.");
      return;
    }

    setLoading(true);

    const { data: invoice, error: insertError } = await supabase
      .from("invoices")
      .insert({
        job_order_id: jobId,
        customer_id: selectedJob.customer_id,
        subtotal: parseFloat(subtotal) || 0,
        tax_amount: parseFloat(taxAmount) || 0,
        total: parseFloat(total) || 0,
        due_date: dueDate || null,
        status: "unpaid",
      })
      .select()
      .single();

    setLoading(false);

    if (insertError || !invoice) {
      setError(insertError?.message ?? "Failed to create invoice.");
      return;
    }

    router.push(`/dashboard/jobs/${jobId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      <div className="rounded-xl border border-gray-200/70 bg-white p-5 shadow-sm">
        <label className="mb-1 block text-xs font-medium text-gray-600">Job Order</label>
        <select
          required
          value={jobId}
          onChange={(e) => handleSelectJob(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Select a job order...</option>
          {jobOrders.map((job) => (
            <option key={job.id} value={job.id}>
              {job.job_number} — {job.customers?.[0]?.name ?? "Unknown"} ({job.status.replace("_", " ")})
            </option>
          ))}
        </select>

        {jobOrders.length === 0 && (
          <p className="mt-2 text-xs text-gray-400">
            Every job order already has an invoice, or none exist yet. Create a job order from an
            approved quotation first.
          </p>
        )}

        {selectedJob && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Subtotal</label>
              <input
                type="number"
                step="0.01"
                value={subtotal}
                onChange={(e) => setSubtotal(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Tax Amount</label>
              <input
                type="number"
                step="0.01"
                value={taxAmount}
                onChange={(e) => setTaxAmount(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Total</label>
              <input
                type="number"
                step="0.01"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold"
              />
            </div>
          </div>
        )}

        {selectedJob && (
          <div className="mt-4">
            <label className="mb-1 block text-xs font-medium text-gray-600">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-magenta-50 px-3 py-2 text-sm text-magenta-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !jobId}
        className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-brand-600 hover:text-white disabled:opacity-60"
      >
        {loading
          ? "Creating..."
          : total
          ? `Create Invoice for ${formatCurrency(parseFloat(total) || 0)}`
          : "Create Invoice"}
      </button>
    </form>
  );
}
