import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CompanyLogo from "@/components/company-logo";
import SidebarNav from "./sidebar-nav";
import SignOutButton from "@/components/sign-out-button";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  sales: "Sales",
  production: "Production",
  qc: "Quality Control",
  accounts: "Accounts",
  delivery: "Delivery",
};

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
    <div className="flex min-h-screen bg-paper">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col justify-between bg-ink-950 px-4 py-6">
        <div>
          <div className="mb-8">
            <CompanyLogo variant="sidebar" />
          </div>

          <SidebarNav role={staff?.role ?? ""} />
        </div>

        <div className="border-t border-white/10 pt-4">
          <p className="px-2 text-sm font-medium text-white">
            {staff?.full_name ?? user.email}
          </p>
          <p className="px-2 text-xs text-gray-500">
            {staff?.role ? ROLE_LABELS[staff.role] ?? staff.role : "Staff"}
          </p>
          <div className="mt-3 px-2">
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 px-8 py-6">{children}</main>
    </div>
  );
}
