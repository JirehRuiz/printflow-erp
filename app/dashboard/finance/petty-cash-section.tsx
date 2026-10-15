import { createClient } from "@/lib/supabase/server";
import { formatCurrency, FUND_SOURCES, FUND_STYLES, matchFund } from "@/lib/constants";
import PettyCashTable from "../petty-cash/petty-cash-table";
import PettyCashForm from "../petty-cash/petty-cash-form";

export default async function PettyCashSection() {
  const supabase = createClient();

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
    rawId: string;
    date: string;
    fund: string;
    label: string;
    detail: string | null;
    amount: number; // signed
    kind: "in" | "expense";
  };

  const rows: Row[] = [
    ...(inflows ?? []).map((t: any) => ({
      id: `in-${t.id}`,
      rawId: t.id as string,
      date: t.transaction_date as string,
      // anything unrecognised is treated as "Other Fund" so nothing is lost
      fund: matchFund(t.fund_name) ?? "Other Fund",
      label: "Cash In",
      detail: t.description as string | null,
      amount: t.amount as number,
      kind: "in" as const,
    })),
    // Only expenses whose Source of Fund matches one of the four funds count
    ...(outflows ?? [])
      .filter((e: any) => matchFund(e.source_of_fund))
      .map((e: any) => ({
        id: `out-${e.id}`,
        rawId: e.id as string,
        date: e.expense_date as string,
        fund: matchFund(e.source_of_fund) as string,
        label: `Expense — ${e.category}`,
        detail: e.description as string | null,
        amount: -(e.amount as number),
        kind: "expense" as const,
      })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  const untrackedExpenses = (outflows ?? []).filter((e: any) => !matchFund(e.source_of_fund));

  // Per-fund running balance (each row shows its own fund's balance after it)
  const running: Record<string, number> = {};
  const ledger = rows.map((r) => {
    running[r.fund] = (running[r.fund] ?? 0) + r.amount;
    return { ...r, balance: running[r.fund] };
  });

  const funds = FUND_SOURCES.map((name) => {
    const mine = rows.filter((r) => r.fund === name);
    const totalIn = mine.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
    const totalOut = mine.filter((r) => r.amount < 0).reduce((s, r) => s + Math.abs(r.amount), 0);
    return { name, totalIn, totalOut, balance: totalIn - totalOut };
  });

  const grandIn = funds.reduce((s, f) => s + f.totalIn, 0);
  const grandOut = funds.reduce((s, f) => s + f.totalOut, 0);
  const grandBalance = grandIn - grandOut;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Petty Cash, Manager's Fund, Daily Sales and Other Fund — what's in, what's gone out, and
          what's left in each.
        </p>
        <a
          href="/print/petty-cash"
          target="_blank"
          rel="noopener noreferrer"
          className="whitespace-nowrap rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          🖨️ Print Statement
        </a>
      </div>

      {/* Totals across all funds */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-ink-950 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-400">Total Balance</p>
          <p
            className={`tabular-nums font-display text-3xl font-semibold ${
              grandBalance >= 0 ? "text-white" : "text-magenta-400"
            }`}
          >
            {formatCurrency(grandBalance)}
          </p>
          <p className="mt-1 text-xs text-gray-500">Across all four funds</p>
        </div>
        <div className="rounded-xl border border-gray-200/70 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase text-gray-400">Total In</p>
          <p className="tabular-nums font-display text-xl font-semibold text-green-700">
            {formatCurrency(grandIn)}
          </p>
          <p className="mt-1 text-xs text-gray-400">All funds, all time</p>
        </div>
        <div className="rounded-xl border border-gray-200/70 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase text-gray-400">Total Out</p>
          <p className="tabular-nums font-display text-xl font-semibold text-magenta-600">
            {formatCurrency(grandOut)}
          </p>
          <p className="mt-1 text-xs text-gray-400">Expenses paid from funds</p>
        </div>
      </div>

      {/* Each fund */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {funds.map((f) => (
          <div key={f.name} className="rounded-xl border border-gray-200/70 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${FUND_STYLES[f.name].dot}`} />
              <p className="text-sm font-semibold text-gray-700">{f.name}</p>
            </div>
            <p
              className={`tabular-nums mt-2 font-display text-2xl font-semibold ${
                f.balance >= 0 ? "text-ink-900" : "text-magenta-600"
              }`}
            >
              {formatCurrency(f.balance)}
            </p>
            {f.balance < 0 && (
              <p className="text-xs font-medium text-magenta-600">⚠ Overdrawn</p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3 text-xs">
              <div>
                <p className="text-gray-400">In</p>
                <p className="tabular-nums font-medium text-green-700">{formatCurrency(f.totalIn)}</p>
              </div>
              <div>
                <p className="text-gray-400">Out</p>
                <p className="tabular-nums font-medium text-magenta-600">
                  {formatCurrency(f.totalOut)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {untrackedExpenses.length > 0 && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {untrackedExpenses.length} older expense{untrackedExpenses.length !== 1 ? "s are" : " is"}{" "}
          tagged with a source that isn't one of the four funds (e.g. "Cashier"), so{" "}
          {untrackedExpenses.length !== 1 ? "they aren't" : "it isn't"} deducted from any fund
          balance. Edit {untrackedExpenses.length !== 1 ? "them" : "it"} on the Expenses tab to
          assign a fund.
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <PettyCashForm />
        </div>
        <div className="lg:col-span-2">
          <PettyCashTable ledger={ledger} />
        </div>
      </div>
    </div>
  );
}
