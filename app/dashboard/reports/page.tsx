import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/constants";
import RevenueChart from "./revenue-chart";
import ProfitLossChart from "./profit-loss-chart";

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

async function getReportData(canSeeProfitLoss: boolean) {
  const supabase = createClient();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [paymentsRes, invoicesRes, jobsRes, quotationsRes, plInvoicesRes] = await Promise.all([
    supabase.from("payments").select("amount, paid_at").gte("paid_at", sixMonthsAgo.toISOString()),
    supabase.from("invoices").select("total, amount_paid, customer_id, customers(name)"),
    supabase.from("job_orders").select("status"),
    supabase.from("quotations").select("status"),
    // Only fetch cost data if this viewer is allowed to see it
    canSeeProfitLoss
      ? supabase
          .from("invoices")
          .select("total, created_at, job_orders(quotation_id)")
          .gte("created_at", sixMonthsAgo.toISOString())
      : Promise.resolve({ data: [] as any[] }),
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

  // --- Profit & Loss (admin/accounts only) ---
  let plBuckets: { month: string; revenue: number; cogs: number; grossProfit: number }[] = [];
  let plTotals = { revenue: 0, cogs: 0, grossProfit: 0, marginPct: 0 };

  if (canSeeProfitLoss) {
    const plInvoices = (plInvoicesRes.data ?? []) as any[];
    const quotationIds = Array.from(
      new Set(plInvoices.map((inv) => inv.job_orders?.quotation_id).filter(Boolean))
    );

    let cogsByQuotation: Record<string, number> = {};
    if (quotationIds.length > 0) {
      const { data: itemRows } = await supabase
        .from("quotation_items")
        .select("quotation_id, qty, cost_price")
        .in("quotation_id", quotationIds);

      (itemRows ?? []).forEach((row: any) => {
        const lineCost = (row.qty ?? 0) * (row.cost_price ?? 0);
        cogsByQuotation[row.quotation_id] = (cogsByQuotation[row.quotation_id] ?? 0) + lineCost;
      });
    }

    const plBucketMap: Record<string, { month: string; revenue: number; cogs: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      plBucketMap[key] = { month: monthLabel(d), revenue: 0, cogs: 0 };
    }

    plInvoices.forEach((inv) => {
      const d = new Date(inv.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = plBucketMap[key];
      if (!bucket) return;
      const quotationId = inv.job_orders?.quotation_id;
      const cogs = quotationId ? cogsByQuotation[quotationId] ?? 0 : 0;
      bucket.revenue += inv.total;
      bucket.cogs += cogs;
    });

    plBuckets = Object.values(plBucketMap).map((b) => ({
      month: b.month,
      revenue: b.revenue,
      cogs: b.cogs,
      grossProfit: b.revenue - b.cogs,
    }));

    const totalRevenuePL = plBuckets.reduce((sum, b) => sum + b.revenue, 0);
    const totalCogs = plBuckets.reduce((sum, b) => sum + b.cogs, 0);
    const totalGrossProfit = totalRevenuePL - totalCogs;
    plTotals = {
      revenue: totalRevenuePL,
      cogs: totalCogs,
      grossProfit: totalGrossProfit,
      marginPct: totalRevenuePL > 0 ? Math.round((totalGrossProfit / totalRevenuePL) * 100) : 0,
    };
  }

  return {
    revenueTrend: buckets.map((b) => ({ month: b.label, revenue: b.revenue })),
    totalRevenue6mo,
    topCustomers,
    jobCounts,
    quoteCounts,
    conversionRate,
    plBuckets,
    plTotals,
  };
}

export default async function ReportsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: currentStaff } = await supabase
    .from("staff")
    .select("role")
    .eq("id", user?.id)
    .single();

  const canSeeProfitLoss = ["admin", "accounts"].includes(currentStaff?.role ?? "");

  const data = await getReportData(canSeeProfitLoss);

  const jobStatusOrder = ["pending", "in_production", "on_hold", "completed", "cancelled"];

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink-900">Reports</h1>
      <p className="mt-1 text-sm text-gray-500">
        A pulse on revenue, customers, and how work is flowing through the shop.
      </p>

      {canSeeProfitLoss && (
        <div className="mt-6 rounded-xl border border-gray-200/70 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Profit &amp; Loss — Last 6 Months</h2>
              <p className="text-xs text-gray-400">
                Based on invoiced amounts and their underlying material costs — visible only to
                Admin and Accounts.
              </p>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs uppercase text-gray-400">Revenue</p>
              <p className="tabular-nums text-lg font-semibold text-ink-900">
                {formatCurrency(data.plTotals.revenue)}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs uppercase text-gray-400">Cost of Goods</p>
              <p className="tabular-nums text-lg font-semibold text-magenta-600">
                {formatCurrency(data.plTotals.cogs)}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs uppercase text-gray-400">Gross Profit</p>
              <p className="tabular-nums text-lg font-semibold text-green-700">
                {formatCurrency(data.plTotals.grossProfit)}
              </p>
            </div>
            <div className="rounded-lg bg-brand-50 p-3">
              <p className="text-xs uppercase text-brand-600">Gross Margin</p>
              <p className="tabular-nums text-lg font-semibold text-brand-700">
                {data.plTotals.marginPct}%
              </p>
            </div>
          </div>

          <ProfitLossChart data={data.plBuckets} />

          <p className="mt-3 text-xs text-gray-400">
            Note: items added to a quotation without a linked catalog entry (custom line items)
            are counted at zero cost, since no cost basis was captured for them — actual margin
            may be slightly better than shown if custom items were used.
          </p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200/70 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Revenue Collected — Last 6 Months</h2>
            <span className="text-sm font-medium text-gray-500">
              Total: {formatCurrency(data.totalRevenue6mo)}
            </span>
          </div>
          <RevenueChart data={data.revenueTrend} />
        </div>

        <div className="rounded-xl border border-gray-200/70 bg-white p-5 shadow-sm">
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
        <div className="rounded-xl border border-gray-200/70 bg-white shadow-sm lg:col-span-2">
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

        <div className="rounded-xl border border-gray-200/70 bg-white p-5 shadow-sm">
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
