import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/constants";
import ExpensesTable from "../expenses/expenses-table";

export default async function ExpensesSection() {
  const supabase = createClient();

  const [{ data: expenses }, { data: suppliers }] = await Promise.all([
    supabase.from("expenses").select("*, suppliers(name)").order("expense_date", { ascending: false }),
    supabase.from("suppliers").select("id, name").eq("is_active", true).order("name"),
  ]);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const thisMonthTotal = (expenses ?? [])
    .filter((e) => new Date(e.expense_date) >= startOfMonth)
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Rent, salaries, utilities, and everything else that isn't job material cost. Feeds
          directly into Net Profit on the Reports page.
        </p>
        <div className="flex items-center gap-3">
          <a
            href="/print/expenses"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 whitespace-nowrap"
          >
            🖨️ Print Report
          </a>
          <div className="rounded-xl border border-gray-200/70 bg-white px-4 py-2 text-right shadow-sm whitespace-nowrap">
            <p className="text-xs uppercase text-gray-400">This Month</p>
            <p className="tabular-nums font-display text-lg font-semibold text-magenta-600">
              {formatCurrency(thisMonthTotal)}
            </p>
          </div>
        </div>
      </div>

      <ExpensesTable expenses={expenses ?? []} suppliers={suppliers ?? []} />
    </div>
  );
}
