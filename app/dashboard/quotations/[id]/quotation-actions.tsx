"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Props = {
  quotationId: string;
  status: string;
  customerId: string;
  existingJob: { id: string; job_number: string } | null;
};

export default function QuotationActions({
  quotationId,
  status,
  customerId,
  existingJob,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approverName, setApproverName] = useState("");

  async function updateStatus(newStatus: string, extra: Record<string, any> = {}) {
    setError(null);
    setLoading(newStatus);

    const { error } = await supabase
      .from("quotations")
      .update({ status: newStatus, ...extra })
      .eq("id", quotationId);

    setLoading(null);

    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  async function handleApprove() {
    if (!approverName.trim()) {
      setError("Enter who approved it (customer contact name).");
      return;
    }
    await updateStatus("approved", {
      approved_at: new Date().toISOString(),
      approved_by_name: approverName,
    });
  }

  async function handleRevise() {
    setError(null);
    setLoading("revise");

    // 1. Fetch current quotation + items
    const { data: current } = await supabase
      .from("quotations")
      .select("*")
      .eq("id", quotationId)
      .single();

    const { data: currentItems } = await supabase
      .from("quotation_items")
      .select("*")
      .eq("quotation_id", quotationId);

    if (!current) {
      setLoading(null);
      setError("Could not load current quotation.");
      return;
    }

    // 2. Mark this version as revised
    await supabase.from("quotations").update({ status: "revised" }).eq("id", quotationId);

    // 3. Create the new version
    const { data: newQuote, error: newQuoteError } = await supabase
      .from("quotations")
      .insert({
        customer_id: current.customer_id,
        lead_id: current.lead_id,
        parent_quotation_id: current.parent_quotation_id ?? current.id,
        version: (current.version ?? 1) + 1,
        status: "draft",
        valid_until: current.valid_until,
        subtotal: current.subtotal,
        discount: current.discount,
        tax_percent: current.tax_percent,
        tax_amount: current.tax_amount,
        total: current.total,
        terms: current.terms,
      })
      .select()
      .single();

    if (newQuoteError || !newQuote) {
      setLoading(null);
      setError(newQuoteError?.message ?? "Failed to create revision.");
      return;
    }

    // 4. Copy line items over
    if (currentItems && currentItems.length > 0) {
      const copiedItems = currentItems.map(({ id, quotation_id, ...rest }) => ({
        ...rest,
        quotation_id: newQuote.id,
      }));
      await supabase.from("quotation_items").insert(copiedItems);
    }

    setLoading(null);
    router.push(`/dashboard/quotations/${newQuote.id}`);
  }

  async function handleCreateJobOrder() {
    setError(null);
    setLoading("job");

    const { data: job, error: jobError } = await supabase
      .from("job_orders")
      .insert({
        quotation_id: quotationId,
        customer_id: customerId,
        status: "pending",
        priority: "normal",
      })
      .select()
      .single();

    setLoading(null);

    if (jobError || !job) {
      setError(jobError?.message ?? "Failed to create job order.");
      return;
    }

    router.push(`/dashboard/jobs/${job.id}`);
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-gray-800">Workflow Actions</h2>

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      )}

      {status === "draft" && (
        <button
          onClick={() => updateStatus("sent")}
          disabled={loading === "sent"}
          className="w-full rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {loading === "sent" ? "Sending..." : "Mark as Sent to Customer"}
        </button>
      )}

      {status === "sent" && (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Approved by (customer contact)
            </label>
            <input
              value={approverName}
              onChange={(e) => setApproverName(e.target.value)}
              placeholder="e.g. Ahmed - Procurement"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={handleApprove}
            disabled={loading === "approved"}
            className="w-full rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {loading === "approved" ? "Approving..." : "✓ Approve"}
          </button>
          <button
            onClick={() => updateStatus("rejected")}
            disabled={loading === "rejected"}
            className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            {loading === "rejected" ? "Rejecting..." : "✕ Reject"}
          </button>
          <button
            onClick={handleRevise}
            disabled={loading === "revise"}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
          >
            {loading === "revise" ? "Creating revision..." : "↻ Create Revision"}
          </button>
        </div>
      )}

      {status === "rejected" && (
        <div className="space-y-3">
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            This quotation was rejected by the customer.
          </p>
          <button
            onClick={handleRevise}
            disabled={loading === "revise"}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
          >
            {loading === "revise" ? "Creating revision..." : "↻ Create Revision"}
          </button>
        </div>
      )}

      {status === "approved" && (
        <div className="space-y-3">
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            ✓ Approved — ready to move into production.
          </p>
          {existingJob ? (
            <Link
              href={`/dashboard/jobs/${existingJob.id}`}
              className="block w-full rounded-lg bg-brand-500 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-brand-600"
            >
              View Job Order {existingJob.job_number} →
            </Link>
          ) : (
            <button
              onClick={handleCreateJobOrder}
              disabled={loading === "job"}
              className="w-full rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {loading === "job" ? "Creating..." : "Create Job Order →"}
            </button>
          )}
        </div>
      )}

      {status === "revised" && (
        <p className="rounded-lg bg-purple-50 px-3 py-2 text-sm text-purple-700">
          A newer revision of this quotation exists.
        </p>
      )}
    </div>
  );
}
