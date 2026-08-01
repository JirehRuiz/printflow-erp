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
    .select("id, invoice_number, status, total, amount_paid, due_date, created_at, customers(name)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-brand-900">Invoices</h1>
      <p className="mt-1 text-sm text-gray-500">
        Payment status updates automatically as payments are recorded.
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Invoice #</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Due Date</th>
            </tr>
          </thead>
          <tbody>
            {invoices && invoices.length > 0 ? (
              invoices.map((inv: any) => (
                <tr key={inv.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-gray-600">{inv.customers?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[inv.status]}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-800">{formatCurrency(inv.total)}</td>
                  <td className="px-4 py-3 text-gray-500">{formatCurrency(inv.amount_paid)}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No invoices yet — these will appear once jobs move through delivery.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
