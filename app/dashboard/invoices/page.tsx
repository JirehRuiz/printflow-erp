import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/constants";

const statusColors: Record<string, string> = {
  unpaid: "bg-red-50 text-red-700",
  partial: "bg-amber-50 text-amber-700",
  paid: "bg-green-50 text-green-700",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-500",
};

export default async function InvoicesPage() {
  const supabase = createClient();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, status, total, amount_paid, due_date, created_at, job_order_id, customers(name), job_orders(job_number)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Invoices</h1>
          <p className="mt-1 text-sm text-gray-500">
            Payment status updates automatically as payments are recorded.
          </p>
        </div>
        <Link
          href="/dashboard/invoices/new"
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-brand-600 hover:text-white"
        >
          + New Invoice
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200/70 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Invoice #</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Job Order</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Due Date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {invoices && invoices.length > 0 ? (
              invoices.map((inv: any) => (
                <tr key={inv.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-gray-600">{inv.customers?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{inv.job_orders?.job_number ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[inv.status]}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-gray-800">{formatCurrency(inv.total)}</td>
                  <td className="px-4 py-3 tabular-nums text-gray-500">{formatCurrency(inv.amount_paid)}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/print/invoices/${inv.id}`}
                        target="_blank"
                        className="text-sm font-medium text-gray-500 hover:underline"
                      >
                        Print
                      </Link>
                      <Link
                        href={`/dashboard/jobs/${inv.job_order_id}`}
                        className="text-sm font-medium text-brand-600 hover:underline"
                      >
                        View Job →
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  No invoices yet — click "New Invoice" or deliver a job to generate one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
