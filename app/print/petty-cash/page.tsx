import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, FUND_SOURCES, matchFund } from "@/lib/constants";
import CompanyLogo from "@/components/company-logo";
import PrintButton from "./print-button";

export default async function FundsPrintPage({
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
    redirect("/dashboard/finance?tab=petty-cash");
  }

  const [{ data: inflows }, { data: outflows }] = await Promise.all([
    supabase
      .from("petty_cash_transactions")
      .select("id, fund_name, amount, transaction_date, description")
      .order("transaction_date", { ascending: true }),
    supabase
      .from("expenses")
      .select("id, category, description, amount, expense_date, source_of_fund")
      .not("source_of_fund", "is", null)
      .order("expense_date", { ascending: true }),
  ]);

  type Row = {
    id: string;
    date: string;
    fund: string;
    label: string;
    detail: string | null;
    amount: number; // signed
  };

  const rows: Row[] = [
    ...(inflows ?? []).map((t: any) => ({
      id: `in-${t.id}`,
      date: t.transaction_date as string,
      fund: matchFund(t.fund_name) ?? "Other Fund",
      label: "Cash In",
      detail: t.description as string | null,
      amount: t.amount as number,
    })),
    ...(outflows ?? [])
      .filter((e: any) => matchFund(e.source_of_fund))
      .map((e: any) => ({
        id: `out-${e.id}`,
        date: e.expense_date as string,
        fund: matchFund(e.source_of_fund) as string,
        label: `Expense — ${e.category}`,
        detail: e.description as string | null,
        amount: -(e.amount as number),
      })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  const { from, to } = searchParams;

  // Per-fund running balance over the FULL history, so a date-filtered
  // statement still shows correct balances
  const running: Record<string, number> = {};
  const fullLedger = rows.map((r) => {
    running[r.fund] = (running[r.fund] ?? 0) + r.amount;
    return { ...r, balance: running[r.fund] };
  });

  const inRange = (d: string) => (!from || d >= from) && (!to || d <= to);
  const ledger = fullLedger.filter((r) => inRange(r.date));

  const summary = FUND_SOURCES.map((name) => {
    const mine = rows.filter((r) => r.fund === name);
    const opening = from ? mine.filter((r) => r.date < from).reduce((s, r) => s + r.amount, 0) : 0;
    const periodRows = mine.filter((r) => inRange(r.date));
    const totalIn = periodRows.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
    const totalOut = periodRows.filter((r) => r.amount < 0).reduce((s, r) => s + Math.abs(r.amount), 0);
    return { name, opening, totalIn, totalOut, closing: opening + totalIn - totalOut };
  });

  const totals = summary.reduce(
    (t, f) => ({
      opening: t.opening + f.opening,
      totalIn: t.totalIn + f.totalIn,
      totalOut: t.totalOut + f.totalOut,
      closing: t.closing + f.closing,
    }),
    { opening: 0, totalIn: 0, totalOut: 0, closing: 0 }
  );

  const rangeLabel =
    from || to
      ? `${from ? new Date(from).toLocaleDateString() : "Start"} — ${
          to ? new Date(to).toLocaleDateString() : "Today"
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
          Funds Statement
        </h2>
        <span className="text-xs text-gray-500">{rangeLabel}</span>
      </div>

      {/* Per-fund summary */}
      <table className="mt-3 w-full border-collapse text-xs">
        <thead>
          <tr className="border-b-2 border-gray-800 text-left uppercase tracking-wide text-gray-500">
            <th className="py-2">Fund</th>
            <th className="py-2 text-right">Opening</th>
            <th className="py-2 text-right">Total In</th>
            <th className="py-2 text-right">Total Out</th>
            <th className="py-2 text-right">Closing Balance</th>
          </tr>
        </thead>
        <tbody>
          {summary.map((f) => (
            <tr key={f.name} className="border-b border-gray-100">
              <td className="py-1.5 font-medium">{f.name}</td>
              <td className="py-1.5 text-right text-gray-500">{formatCurrency(f.opening)}</td>
              <td className="py-1.5 text-right text-green-700">{formatCurrency(f.totalIn)}</td>
              <td className="py-1.5 text-right text-magenta-600">{formatCurrency(f.totalOut)}</td>
              <td
                className={`py-1.5 text-right font-semibold ${
                  f.closing >= 0 ? "text-ink-900" : "text-magenta-600"
                }`}
              >
                {formatCurrency(f.closing)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-ink-900 font-bold">
            <td className="py-2">Total</td>
            <td className="py-2 text-right text-gray-500">{formatCurrency(totals.opening)}</td>
            <td className="py-2 text-right text-green-700">{formatCurrency(totals.totalIn)}</td>
            <td className="py-2 text-right text-magenta-600">{formatCurrency(totals.totalOut)}</td>
            <td
              className={`py-2 text-right ${
                totals.closing >= 0 ? "text-ink-900" : "text-magenta-600"
              }`}
            >
              {formatCurrency(totals.closing)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Ledger */}
      <p className="mt-5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        Transactions
      </p>
      <table className="mt-1 w-full border-collapse text-xs">
        <thead>
          <tr className="border-b-2 border-gray-800 text-left uppercase tracking-wide text-gray-500">
            <th className="py-2">Date</th>
            <th className="py-2">Fund</th>
            <th className="py-2">Detail</th>
            <th className="py-2 text-right">Amount</th>
            <th className="py-2 text-right">Fund Balance</th>
          </tr>
        </thead>
        <tbody>
          {ledger.map((row) => (
            <tr key={row.id} className="border-b border-gray-100">
              <td className="py-1.5 text-gray-500">{new Date(row.date).toLocaleDateString()}</td>
              <td className="py-1.5">{row.fund}</td>
              <td className="py-1.5 text-gray-600">
                {row.label}
                {row.detail ? ` — ${row.detail}` : ""}
              </td>
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
          {ledger.length === 0 && (
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
