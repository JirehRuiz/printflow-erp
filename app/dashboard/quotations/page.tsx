import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/constants";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-amber-50 text-amber-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
  revised: "bg-purple-50 text-purple-700",
  expired: "bg-gray-100 text-gray-400",
};

export default async function QuotationsPage() {
  const supabase = createClient();

  const { data: quotations } = await supabase
    .from("quotations")
    .select("id, quote_number, status, version, total, valid_until, created_at, customers(name)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-900">Quotations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Build, send, and track approvals before a job order is created.
          </p>
        </div>
        <Link
          href="/dashboard/quotations/new"
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          + New Quotation
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Quote #</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Valid Until</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {quotations && quotations.length > 0 ? (
              quotations.map((q: any) => (
                <tr key={q.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {q.quote_number}
                    {q.version > 1 && (
                      <span className="ml-1 text-xs text-gray-400">v{q.version}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{q.customers?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[q.status]}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-800">{formatCurrency(q.total ?? 0)}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {q.valid_until ? new Date(q.valid_until).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/quotations/${q.id}`}
                      className="text-sm font-medium text-brand-600 hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No quotations yet — create your first one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
