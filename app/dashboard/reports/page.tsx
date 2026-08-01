import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/constants";
import RevenueChart from "./revenue-chart";

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

async function getReportData() {
  const supabase = createClient();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [paymentsRes, invoicesRes, jobsRes, quotationsRes] = await Promise.all([
    supabase.from("payments").select("amount, paid_at").gte("paid_at", sixMonthsAgo.toISOString()),
    supabase.from("invoices").select("total, amount_paid, customer_id, customers(name)"),
    supabase.from("job_orders").select("status"),
    supabase.from("quotations").select("status"),
  ]);

  // --- Revenue trend: bucket payments into the last 6 calendar months ---
  const buckets: { key: string; label: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: monthLabel(d),
      revenue: 0,
    });
  }
  (paymentsRes.data ?? []).forEach((p) => {
    const d = new Date(p.paid_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = buckets.find((b) => b.key === key);
    if (bucket) bucket.revenue += p.amount;
  });

  // --- Top customers by total invoiced value ---
  const customerTotals = new Map<string, { name: string; total: number; paid: number }>();
  (invoicesRes.data ?? []).forEach((inv: any) => {
    const name = inv.customers?.name ?? "Unknown";
    const existing = customerTotals.get(inv.customer_id) ?? { name, total: 0, paid: 0 };
    existing.total += inv.total;
    existing.paid += inv.amount_paid;
    customerTotals.set(inv.customer_id, existing);
  });
  const topCustomers = Array.from(customerTotals.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // --- Job status breakdown ---
  const jobCounts: Record<string, number> = {};
  (jobsRes.data ?? []).forEach((j) => {
    jobCounts[j.status] = (jobCounts[j.status] ?? 0) + 1;
  });

  // --- Quotation conversion ---
  const quoteCounts: Record<string, number> = {};
  (quotationsRes.data ?? []).forEach((q) => {
    quoteCounts[q.status] = (quoteCounts[q.status] ?? 0) + 1;
  });
  const decided = (quoteCounts.approved ?? 0) + (quoteCounts.rejected ?? 0);
  const conversionRate = decided > 0 ? Math.round(((quoteCounts.approved ?? 0) / decided) * 100) : null;

  const totalRevenue6mo = buckets.reduce((sum, b) => sum + b.revenue, 0);

  return {
    revenueTrend: buckets.map((b) => ({ month: b.label, revenue: b.revenue })),
    totalRevenue6mo,
    topCustomers,
    jobCounts,
    quoteCounts,
    conversionRate,
  };
}

export default async function ReportsPage() {
  const data = await getReportData();

  const jobStatusOrder = ["pending", "in_production", "on_hold", "completed", "cancelled"];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-brand-900">Reports</h1>
      <p className="mt-1 text-sm text-gray-500">
        A pulse on revenue, customers, and how work is flowing through the shop.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Revenue — Last 6 Months</h2>
            <span className="text-sm font-medium text-gray-500">
              Total: {formatCurrency(data.totalRevenue6mo)}
            </span>
          </div>
          <RevenueChart data={data.revenueTrend} />
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-800">Quotation Conversion</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Sent</span>
              <span className="font-medium text-gray-700">{data.quoteCounts.sent ?? 0}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Approved</span>
              <span className="font-medium text-green-700">{data.quoteCounts.approved ?? 0}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Rejected</span>
              <span className="font-medium text-red-600">{data.quoteCounts.rejected ?? 0}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Drafts</span>
              <span className="font-medium text-gray-700">{data.quoteCounts.draft ?? 0}</span>
            </div>
          </div>
          {data.conversionRate !== null && (
            <div className="mt-4 rounded-lg bg-brand-50 px-3 py-3 text-center">
              <p className="text-2xl font-bold text-brand-700">{data.conversionRate}%</p>
              <p className="text-xs text-brand-600">win rate (approved vs. decided)</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm lg:col-span-2">
          <div className="border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-800">Top Customers by Value</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {data.topCustomers.length > 0 ? (
              data.topCustomers.map((c, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
                      {i + 1}
                    </span>
                    <span className="font-medium text-gray-800">{c.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-700">{formatCurrency(c.total)}</p>
                    <p className="text-xs text-gray-400">{formatCurrency(c.paid)} collected</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="px-5 py-6 text-center text-sm text-gray-400">
                No invoiced customers yet.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-800">Jobs by Status</h2>
          <div className="space-y-2 text-sm">
            {jobStatusOrder.map((status) => (
              <div key={status} className="flex justify-between text-gray-500">
                <span className="capitalize">{status.replace("_", " ")}</span>
                <span className="font-medium text-gray-700">{data.jobCounts[status] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
