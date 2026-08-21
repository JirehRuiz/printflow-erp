import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/constants";
import CompanyLogo from "@/components/company-logo";
import PrintButton from "./print-button";

export default async function ExpensesPrintPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: currentStaff } = await supabase
    .from("staff")
    .select("role")
    .eq("id", user?.id)
    .single();

  if (!["admin", "accounts"].includes(currentStaff?.role ?? "")) {
    redirect("/dashboard/finance?tab=expenses");
  }

  let query = supabase
    .from("expenses")
    .select("expense_date, category, description, amount, payment_method, source_of_fund, suppliers(name)")
    .order("expense_date", { ascending: true });

  if (searchParams.from) query = query.gte("expense_date", searchParams.from);
  if (searchParams.to) query = query.lte("expense_date", searchParams.to);

  const { data: expenses } = await query;

  const total = (expenses ?? []).reduce((sum, e) => sum + e.amount, 0);

  const byCategory = new Map<string, number>();
  (expenses ?? []).forEach((e) => {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
  });
  const categoryBreakdown = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]);

  const rangeLabel =
    searchParams.from || searchParams.to
      ? `${searchParams.from ? new Date(searchParams.from).toLocaleDateString() : "Start"} — ${
          searchParams.to ? new Date(searchParams.to).toLocaleDateString() : "Today"
        }`
      : "All Time";

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-[13px] text-gray-800">
      <div className="mb-4 flex justify-end print:hidden">
        <PrintButton />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between border-b border-gray-100 pb-3">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/arabic-tagline.png" alt="" className="mb-1 h-3 w-auto" />
          <CompanyLogo variant="print" />
        </div>
        <div className="text-right">
          <h1 className="font-display text-sm font-bold text-ink-900">
            SKYLAR ADVERTISING FZE LLC
          </h1>
          <p className="mt-0.5 text-[10px] text-gray-500">Dubai Investments Park 2, Dubai, UAE</p>
          <p className="text-[10px] text-gray-500">skylar.adservices@gmail.com</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <h2 className="font-display text-base font-bold tracking-tight text-ink-900">
          Expense Report
        </h2>
        <span className="text-xs text-gray-500">{rangeLabel}</span>
      </div>

      {/* Summary */}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-[10px] uppercase text-gray-400">Total Expenses</p>
          <p className="tabular-nums text-base font-semibold text-magenta-600">
            {formatCurrency(total)}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-[10px] uppercase text-gray-400">Entries</p>
          <p className="tabular-nums text-base font-semibold text-ink-900">
            {(expenses ?? []).length}
          </p>
        </div>
        <div className="col-span-2 rounded-lg bg-gray-50 p-3">
          <p className="mb-1 text-[10px] uppercase text-gray-400">By Category</p>
          <div className="flex flex-wrap gap-1">
            {categoryBreakdown.map(([cat, amt]) => (
              <span key={cat} className="rounded-full bg-white px-2 py-0.5 text-[10px] text-gray-600">
                {cat}: <span className="font-medium">{formatCurrency(amt)}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <table className="mt-4 w-full border-collapse text-xs">
        <thead>
          <tr className="border-b-2 border-gray-800 text-left uppercase tracking-wide text-gray-500">
            <th className="py-2">Date</th>
            <th className="py-2">Category</th>
            <th className="py-2">Description</th>
            <th className="py-2">Supplier</th>
            <th className="py-2">Source</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {(expenses ?? []).map((e: any, i: number) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-1.5 text-gray-500">
                {new Date(e.expense_date).toLocaleDateString()}
              </td>
              <td className="py-1.5">{e.category}</td>
              <td className="py-1.5 text-gray-600">{e.description ?? "—"}</td>
              <td className="py-1.5 text-gray-500">{e.suppliers?.name ?? "—"}</td>
              <td className="py-1.5 text-gray-500">{e.source_of_fund ?? "—"}</td>
              <td className="py-1.5 text-right font-medium">{formatCurrency(e.amount)}</td>
            </tr>
          ))}
          {(!expenses || expenses.length === 0) && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-gray-400">
                No expenses in this range.
              </td>
            </tr>
          )}
        </tbody>
        {expenses && expenses.length > 0 && (
          <tfoot>
            <tr className="border-t-2 border-ink-900">
              <td colSpan={5} className="py-2 text-right font-semibold">
                Total
              </td>
              <td className="py-2 text-right font-bold text-ink-900">{formatCurrency(total)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
