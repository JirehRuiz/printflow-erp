import Link from "next/link";
import { Target, FileClock, Factory, TrendingUp, TrendingDown, AlertCircle, Package, ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/constants";

async function getStats() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const startOfLastMonth = new Date(startOfMonth);
  startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
  const endOfLastMonth = new Date(startOfMonth);
  endOfLastMonth.setMilliseconds(-1);

  const [
    staff,
    leads,
    quotations,
    jobsInProduction,
    outstandingInvoices,
    paidThisMonth,
    paidLastMonth,
    recentQuotations,
    recentJobs,
    inventoryItems,
  ] = await Promise.all([
    supabase.from("staff").select("full_name").eq("id", user?.id ?? "").single(),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("quotations").select("id", { count: "exact", head: true }).eq("status", "sent"),
    supabase.from("job_orders").select("id", { count: "exact", head: true }).eq("status", "in_production"),
    supabase.from("invoices").select("total, amount_paid").in("status", ["unpaid", "partial", "overdue"]),
    supabase.from("payments").select("amount").gte("paid_at", startOfMonth.toISOString()),
    supabase
      .from("payments")
      .select("amount")
      .gte("paid_at", startOfLastMonth.toISOString())
      .lte("paid_at", endOfLastMonth.toISOString()),
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
    supabase
      .from("inventory_items")
      .select("quantity_on_hand, reorder_level")
      .eq("is_active", true),
  ]);

  const lowStockCount = (inventoryItems.data ?? []).filter(
    (i) => i.quantity_on_hand <= i.reorder_level
  ).length;

  const outstandingBalance = (outstandingInvoices.data ?? []).reduce(
    (sum, inv) => sum + (inv.total - inv.amount_paid),
    0
  );
  const revenueThisMonth = (paidThisMonth.data ?? []).reduce((sum, p) => sum + p.amount, 0);
  const revenueLastMonth = (paidLastMonth.data ?? []).reduce((sum, p) => sum + p.amount, 0);
  const revenueChangePct =
    revenueLastMonth > 0
      ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
      : null;

  return {
    staffName: staff.data?.full_name ?? "there",
    newLeads: leads.count ?? 0,
    pendingQuotes: quotations.count ?? 0,
    activeJobs: jobsInProduction.count ?? 0,
    outstandingBalance,
    revenueThisMonth,
    revenueChangePct,
    lowStockCount,
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

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardOverviewPage() {
  const stats = await getStats();

  const cards = [
    {
      label: "New Leads",
      value: stats.newLeads,
      icon: Target,
      iconBg: "bg-brand-50",
      iconColor: "text-brand-600",
      href: "/dashboard/leads",
    },
    {
      label: "Quotes Awaiting Approval",
      value: stats.pendingQuotes,
      icon: FileClock,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      href: "/dashboard/quotations",
    },
    {
      label: "Jobs In Production",
      value: stats.activeJobs,
      icon: Factory,
      iconBg: "bg-brand-50",
      iconColor: "text-brand-700",
      href: "/dashboard/production",
    },
    {
      label: "Revenue This Month",
      value: formatCurrency(stats.revenueThisMonth),
      icon: TrendingUp,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      href: "/dashboard/invoices",
      trend: stats.revenueChangePct,
    },
    {
      label: "Outstanding Balance",
      value: formatCurrency(stats.outstandingBalance),
      icon: AlertCircle,
      iconBg: "bg-magenta-50",
      iconColor: "text-magenta-600",
      href: "/dashboard/invoices",
    },
    {
      label: "Low Stock Items",
      value: stats.lowStockCount,
      icon: Package,
      iconBg: "bg-magenta-50",
      iconColor: "text-magenta-600",
      href: "/dashboard/inventory",
    },
  ];

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-ink-950 px-6 py-7 sm:px-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-magenta-500/10 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-400">{today}</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-white sm:text-3xl">
            {greeting()}, {stats.staffName.split(" ")[0]} 👋
          </h1>
          <p className="mt-2 max-w-xl text-sm text-gray-400">
            Here's what's moving through the shop right now — leads, quotes, active jobs, and cash flow, all in one place.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group relative overflow-hidden rounded-xl border border-gray-200/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gray-50 transition-colors group-hover:bg-brand-50" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.iconBg}`}>
                    <Icon size={16} className={card.iconColor} strokeWidth={2} />
                  </div>
                  {"trend" in card && card.trend !== null && card.trend !== undefined && (
                    <span
                      className={`flex items-center gap-0.5 text-xs font-medium ${
                        card.trend >= 0 ? "text-green-600" : "text-magenta-600"
                      }`}
                    >
                      {card.trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {Math.abs(card.trend)}%
                    </span>
                  )}
                </div>
                <p className="tabular-nums mt-3 font-display text-2xl font-semibold text-ink-900">
                  {card.value}
                </p>
                <p className="mt-1 text-xs font-medium text-gray-400">{card.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200/70 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-800">Recent Quotations</h2>
            <Link
              href="/dashboard/quotations"
              className="flex items-center gap-0.5 text-xs font-medium text-brand-600 hover:underline"
            >
              View all <ArrowUpRight size={12} />
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

        <div className="rounded-xl border border-gray-200/70 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-800">Recent Job Orders</h2>
            <Link
              href="/dashboard/jobs"
              className="flex items-center gap-0.5 text-xs font-medium text-brand-600 hover:underline"
            >
              View all <ArrowUpRight size={12} />
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
