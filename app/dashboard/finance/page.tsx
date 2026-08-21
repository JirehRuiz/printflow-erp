import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ExpensesSection from "./expenses-section";
import PettyCashSection from "./petty-cash-section";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: { tab?: string };
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

  const hasAccess = ["admin", "accounts"].includes(currentStaff?.role ?? "");

  if (!hasAccess) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900">Finance</h1>
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">
            This page is restricted to Admin and Accounts. If you need access, ask an admin.
          </p>
        </div>
      </div>
    );
  }

  const activeTab = searchParams.tab === "petty-cash" ? "petty-cash" : "expenses";

  const tabs = [
    { key: "expenses", label: "Expenses" },
    { key: "petty-cash", label: "Petty Cash" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink-900">Finance</h1>
      <p className="mt-1 text-sm text-gray-500">
        Operating expenses and petty cash — the day-to-day money in and out of the business.
      </p>

      {/* Tabs */}
      <div className="mt-5 flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/dashboard/finance?tab=${tab.key}`}
            className={`relative px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.key
                ? "text-brand-700"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-500" />
            )}
          </Link>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === "expenses" ? <ExpensesSection /> : <PettyCashSection />}
      </div>
    </div>
  );
}
