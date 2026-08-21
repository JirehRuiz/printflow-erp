import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/constants";
import PettyCashTable from "../petty-cash/petty-cash-table";
import PettyCashForm from "../petty-cash/petty-cash-form";

export default async function PettyCashSection() {
  const supabase = createClient();

  const [{ data: inflows }, { data: outflows }] = await Promise.all([
    supabase
      .from("petty_cash_transactions")
      .select("id, transaction_type, amount, transaction_date, description, notes, created_at, staff(full_name)")
      .order("transaction_date", { ascending: true }),
    supabase
      .from("expenses")
      .select("id, category, description, amount, expense_date, created_at")
      .ilike("source_of_fund", "petty cash")
      .order("expense_date", { ascending: true }),
  ]);

  type LedgerRow = {
    id: string;
    date: string;
    label: string;
    detail: string | null;
    amount: number;
    kind: "daily_sales" | "top_up" | "expense";
  };

  const rows: LedgerRow[] = [
    ...(inflows ?? []).map((t: any) => ({
      id: `in-${t.id}`,
      date: t.transaction_date,
      label: t.transaction_type === "daily_sales" ? "Daily Sales" : "Top-up",
      detail: t.description,
      amount: t.amount,
      kind: t.transaction_type as "daily_sales" | "top_up",
    })),
    ...(outflows ?? []).map((e: any) => ({
      id: `out-${e.id}`,
      date: e.expense_date,
      label: `Expense — ${e.category}`,
      detail: e.description,
      amount: -e.amount,
      kind: "expense" as const,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  let running = 0;
  const ledger = rows.map((r) => {
    running += r.amount;
    return { ...r, balance: running };
  });

  const totalIn = rows.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
  const totalOut = rows.filter((r) => r.amount < 0).reduce((s, r) => s + Math.abs(r.amount), 0);
  const balance = totalIn - totalOut;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const salesThisMonth = (inflows ?? [])
    .filter((t: any) => t.transaction_type === "daily_sales" && new Date(t.transaction_date) >= startOfMonth)
    .reduce((s: number, t: any) => s + t.amount, 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Daily sales cash and top-ups, tracked against what's been spent from petty cash.
        </p>
        <a
          href="/print/petty-cash"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 whitespace-nowrap"
        >
          🖨️ Print Statement
        </a>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200/70 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase text-gray-400">Current Balance</p>
          <p
            className={`tabular-nums font-display text-3xl font-semibold ${
              balance >= 0 ? "text-ink-900" : "text-magenta-600"
            }`}
          >
            {formatCurrency(balance)}
          </p>
          {balance < 0 && (
            <p className="mt-1 text-xs font-medium text-magenta-600">
              ⚠ Petty cash is overdrawn — more has gone out than in.
            </p>
          )}
        </div>
        <div className="rounded-xl border border-gray-200/70 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase text-gray-400">Total In</p>
          <p className="tabular-nums font-display text-xl font-semibold text-green-700">
            {formatCurrency(totalIn)}
          </p>
          <p className="mt-1 text-xs text-gray-400">Daily sales + top-ups, all time</p>
        </div>
        <div className="rounded-xl border border-gray-200/70 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase text-gray-400">Total Out</p>
          <p className="tabular-nums font-display text-xl font-semibold text-magenta-600">
            {formatCurrency(totalOut)}
          </p>
          <p className="mt-1 text-xs text-gray-400">Expenses paid from petty cash</p>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Daily sales collected this month:{" "}
        <span className="font-medium text-gray-600">{formatCurrency(salesThisMonth)}</span>
      </p>

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
