import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/constants";
import CompanyLogo from "@/components/company-logo";
import PrintButton from "./print-button";

export default async function PettyCashPrintPage({
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
    redirect("/dashboard/petty-cash");
  }

  const [{ data: inflows }, { data: outflows }] = await Promise.all([
    supabase
      .from("petty_cash_transactions")
      .select("id, transaction_type, amount, transaction_date, description")
      .order("transaction_date", { ascending: true }),
    supabase
      .from("expenses")
      .select("id, category, description, amount, expense_date")
      .ilike("source_of_fund", "petty cash")
      .order("expense_date", { ascending: true }),
  ]);

  type LedgerRow = {
    id: string;
    date: string;
    label: string;
    detail: string | null;
    amount: number;
  };

  let rows: LedgerRow[] = [
    ...(inflows ?? []).map((t: any) => ({
      id: `in-${t.id}`,
      date: t.transaction_date,
      label: t.transaction_type === "daily_sales" ? "Daily Sales" : "Top-up",
      detail: t.description,
      amount: t.amount,
    })),
    ...(outflows ?? []).map((e: any) => ({
      id: `out-${e.id}`,
      date: e.expense_date,
      label: `Expense — ${e.category}`,
      detail: e.description,
      amount: -e.amount,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  // Running balance calculated over the FULL history first, so the
  // starting balance for a filtered range is still accurate
  let runningFull = 0;
  const fullLedger = rows.map((r) => {
    runningFull += r.amount;
    return { ...r, balance: runningFull };
  });

  const filtered = fullLedger.filter((r) => {
    if (searchParams.from && r.date < searchParams.from) return false;
    if (searchParams.to && r.date > searchParams.to) return false;
    return true;
  });

  const openingBalance =
    filtered.length > 0 ? filtered[0].balance - filtered[0].amount : runningFull;
  const closingBalance = filtered.length > 0 ? filtered[filtered.length - 1].balance : runningFull;
  const periodIn = filtered.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
  const periodOut = filtered.filter((r) => r.amount < 0).reduce((s, r) => s + Math.abs(r.amount), 0);

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
          Petty Cash Statement
        </h2>
        <span className="text-xs text-gray-500">{rangeLabel}</span>
      </div>

      {/* Summary */}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-[10px] uppercase text-gray-400">Opening Balance</p>
          <p className="tabular-nums text-base font-semibold text-ink-900">
            {formatCurrency(openingBalance)}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-[10px] uppercase text-gray-400">Total In</p>
          <p className="tabular-nums text-base font-semibold text-green-700">
            {formatCurrency(periodIn)}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-[10px] uppercase text-gray-400">Total Out</p>
          <p className="tabular-nums text-base font-semibold text-magenta-600">
            {formatCurrency(periodOut)}
          </p>
        </div>
        <div className="rounded-lg bg-brand-50 p-3">
          <p className="text-[10px] uppercase text-brand-600">Closing Balance</p>
          <p
            className={`tabular-nums text-base font-semibold ${
              closingBalance >= 0 ? "text-brand-700" : "text-magenta-600"
            }`}
          >
            {formatCurrency(closingBalance)}
          </p>
        </div>
      </div>

      {/* Table */}
      <table className="mt-4 w-full border-collapse text-xs">
        <thead>
          <tr className="border-b-2 border-gray-800 text-left uppercase tracking-wide text-gray-500">
            <th className="py-2">Date</th>
            <th className="py-2">Type</th>
            <th className="py-2">Detail</th>
            <th className="py-2 text-right">Amount</th>
            <th className="py-2 text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => (
            <tr key={row.id} className="border-b border-gray-100">
              <td className="py-1.5 text-gray-500">{new Date(row.date).toLocaleDateString()}</td>
              <td className="py-1.5">{row.label}</td>
              <td className="py-1.5 text-gray-600">{row.detail ?? "—"}</td>
              <td
                className={`py-1.5 text-right font-medium ${
                  row.amount >= 0 ? "text-green-700" : "text-magenta-600"
                }`}
              >
                {row.amount >= 0 ? "+" : ""}
                {formatCurrency(row.amount)}
              </td>
              <td className="py-1.5 text-right font-semibold text-ink-900">
                {formatCurrency(row.balance)}
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-gray-400">
                No activity in this range.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
