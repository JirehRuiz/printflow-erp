"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/constants";

type Invoice = {
  id: string;
  invoice_number: string;
  status: string;
  total: number;
  amount_paid: number;
} | null;

export default function InvoiceSection({
  jobOrderId,
  customerId,
  quotation,
  invoice,
}: {
  jobOrderId: string;
  customerId: string;
  quotation: { total: number; subtotal: number; tax_amount: number };
  invoice: Invoice;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [error, setError] = useState<string | null>(null);

  async function generateInvoice() {
    setLoading(true);
    setError(null);

    const { error } = await supabase.from("invoices").insert({
      job_order_id: jobOrderId,
      customer_id: customerId,
      subtotal: quotation.subtotal,
      tax_amount: quotation.tax_amount,
      total: quotation.total,
      status: "unpaid",
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  async function recordPayment() {
    if (!invoice) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await supabase.from("payments").insert({
      invoice_id: invoice.id,
      amount,
      method,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    setPaymentAmount("");
    router.refresh();
  }

  if (!invoice) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-800">Invoice</h2>
        <p className="mb-3 text-sm text-gray-500">
          Delivery is confirmed. Generate the invoice to move this job into billing.
        </p>
        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
        )}
        <button
          onClick={generateInvoice}
          disabled={loading}
          className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {loading ? "Generating..." : `Generate Invoice for ${formatCurrency(quotation.total)}`}
        </button>
      </div>
    );
  }

  const balance = invoice.total - invoice.amount_paid;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">Invoice {invoice.invoice_number}</h2>
        <div className="flex items-center gap-3">
          <a
            href={`/print/invoices/${invoice.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-gray-400 hover:text-brand-600 hover:underline"
          >
            Print / PDF
          </a>
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              invoice.status === "paid"
                ? "bg-green-50 text-green-700"
                : invoice.status === "partial"
                ? "bg-amber-50 text-amber-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {invoice.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs uppercase text-gray-400">Total</p>
          <p className="font-medium text-gray-800">{formatCurrency(invoice.total)}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-400">Paid</p>
          <p className="font-medium text-green-700">{formatCurrency(invoice.amount_paid)}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-400">Balance</p>
          <p className="font-medium text-red-600">{formatCurrency(balance)}</p>
        </div>
      </div>

      {invoice.status !== "paid" && (
        <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Amount"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}
          <button
            onClick={recordPayment}
            disabled={loading}
            className="w-full rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {loading ? "Recording..." : "Record Payment"}
          </button>
        </div>
      )}

      {invoice.status === "paid" && (
        <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
          ✓ Fully paid — job complete.
        </p>
      )}
    </div>
  );
}
