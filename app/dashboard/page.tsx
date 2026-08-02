import Link from "next/link";
import { Target, FileClock, Factory, TrendingUp, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/constants";

async function getStats() {
  const supabase = createClient();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    leads,
    quotations,
    jobsInProduction,
    outstandingInvoices,
    paidThisMonth,
    recentQuotations,
    recentJobs,
  ] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("quotations").select("id", { count: "exact", head: true }).eq("status", "sent"),
    supabase.from("job_orders").select("id", { count: "exact", head: true }).eq("status", "in_production"),
    supabase.from("invoices").select("total, amount_paid").in("status", ["unpaid", "partial", "overdue"]),
    supabase
      .from("payments")
      .select("amount")
      .gte("paid_at", startOfMonth.toISOString()),
    supabase
      .from("quotations")
      .select("id, quote_number, status, total, customers(name)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("job_orders")
      .select("id, job_number, status, due_date, customers(name)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const outstandingBalance = (outstandingInvoices.data ?? []).reduce(
    (sum, inv) => sum + (inv.total - inv.amount_paid),
    0
  );
  const revenueThisMonth = (paidThisMonth.data ?? []).reduce((sum, p) => sum + p.amount, 0);

  return {
    newLeads: leads.count ?? 0,
    pendingQuotes: quotations.count ?? 0,
    activeJobs: jobsInProduction.count ?? 0,
    outstandingBalance,
    revenueThisMonth,
    recentQuotations: recentQuotations.data ?? [],
    recentJobs: recentJobs.data ?? [],
  };
}

const quoteStatusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-amber-50 text-amber-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
  revised: "bg-purple-50 text-purple-700",
};

const jobStatusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  in_production: "bg-purple-50 text-purple-700",
  on_hold: "bg-amber-50 text-amber-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-700",
};

export default async function DashboardOverviewPage() {
  const stats = await getStats();

  const cards = [
    { label: "New Leads", value: stats.newLeads, icon: Target, iconColor: "text-brand-500", href: "/dashboard/leads" },
    { label: "Quotes Awaiting Approval", value: stats.pendingQuotes, icon: FileClock, iconColor: "text-amber-500", href: "/dashboard/quotations" },
    { label: "Jobs In Production", value: stats.activeJobs, icon: Factory, iconColor: "text-brand-600", href: "/dashboard/production" },
    { label: "Revenue This Month", value: formatCurrency(stats.revenueThisMonth), icon: TrendingUp, iconColor: "text-green-600", href: "/dashboard/invoices" },
    { label: "Outstanding Balance", value: formatCurrency(stats.outstandingBalance), icon: AlertCircle, iconColor: "text-magenta-500", href: "/dashboard/invoices" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink-900">Overview</h1>
      <p className="mt-1 text-sm text-gray-500">
        A live snapshot of what's moving through the shop right now.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group rounded-xl border border-gray-200/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  {card.label}
                </p>
                <Icon size={16} className={card.iconColor} strokeWidth={2} />
              </div>
              <p className="tabular-nums mt-2 font-display text-2xl font-semibold text-ink-900">
                {card.value}
              </p>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200/70 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-800">Recent Quotations</h2>
            <Link href="/dashboard/quotations" className="text-xs font-medium text-brand-600 hover:underline">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.recentQuotations.length > 0 ? (
              stats.recentQuotations.map((q: any) => (
                <Link
                  key={q.id}
                  href={`/dashboard/quotations/${q.id}`}
                  className="flex items-center justify-between px-5 py-3 text-sm hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-800">{q.quote_number}</p>
                    <p className="text-xs text-gray-400">{q.customers?.name ?? "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-700">{formatCurrency(q.total)}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${quoteStatusColors[q.status]}`}>
                      {q.status}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="px-5 py-6 text-center text-sm text-gray-400">No quotations yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-800">Recent Job Orders</h2>
            <Link href="/dashboard/jobs" className="text-xs font-medium text-brand-600 hover:underline">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.recentJobs.length > 0 ? (
              stats.recentJobs.map((j: any) => (
                <Link
                  key={j.id}
                  href={`/dashboard/jobs/${j.id}`}
                  className="flex items-center justify-between px-5 py-3 text-sm hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-800">{j.job_number}</p>
                    <p className="text-xs text-gray-400">{j.customers?.name ?? "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">
                      {j.due_date ? `Due ${new Date(j.due_date).toLocaleDateString()}` : "No due date"}
                    </p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${jobStatusColors[j.status]}`}>
                      {j.status.replace("_", " ")}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="px-5 py-6 text-center text-sm text-gray-400">No job orders yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
