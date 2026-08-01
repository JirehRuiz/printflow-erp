import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/sign-out-button";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: "📊" },
  { href: "/dashboard/leads", label: "Leads", icon: "🎯" },
  { href: "/dashboard/customers", label: "Customers", icon: "👥" },
  { href: "/dashboard/quotations", label: "Quotations", icon: "📄" },
  { href: "/dashboard/jobs", label: "Job Orders", icon: "🗂️" },
  { href: "/dashboard/production", label: "Production", icon: "🏭" },
  { href: "/dashboard/invoices", label: "Invoices", icon: "💳" },
  { href: "/dashboard/reports", label: "Reports", icon: "📈" },
  { href: "/dashboard/staff", label: "Staff", icon: "🧑‍💼" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: staff } = await supabase
    .from("staff")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col justify-between border-r border-gray-200 bg-white px-4 py-6">
        <div>
          <div className="mb-8 flex items-center gap-2 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">
              PF
            </div>
            <span className="text-base font-semibold text-brand-900">
              PrintFlow
            </span>
          </div>

          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-brand-50 hover:text-brand-700"
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="px-2 text-sm font-medium text-gray-800">
            {staff?.full_name ?? user.email}
          </p>
          <p className="px-2 text-xs uppercase tracking-wide text-gray-400">
            {staff?.role ?? "staff"}
          </p>
          <div className="mt-3 px-2">
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-[#f6f7fb] px-8 py-6">{children}</main>
    </div>
  );
}
