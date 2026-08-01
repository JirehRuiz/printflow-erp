import { createClient } from "@/lib/supabase/server";
import StaffTable from "./staff-table";

export default async function StaffPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: currentStaff } = await supabase
    .from("staff")
    .select("role")
    .eq("id", user?.id)
    .single();

  const isAdmin = currentStaff?.role === "admin";

  const { data: staff } = await supabase
    .from("staff")
    .select("id, full_name, role, department, phone, is_active, created_at")
    .order("created_at", { ascending: true });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-brand-900">Staff Directory</h1>
      <p className="mt-1 text-sm text-gray-500">
        {isAdmin
          ? "Manage roles and access for your team. Changes take effect immediately."
          : "Everyone with access to PrintFlow. Only admins can make changes here."}
      </p>

      <div className="mt-6">
        <StaffTable staff={staff ?? []} isAdmin={isAdmin} currentUserId={user?.id ?? ""} />
      </div>

      {isAdmin && (
        <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white p-4 text-xs text-gray-400">
          To add a brand-new person: create their login in Supabase → Authentication → Users
          first (with "Auto Confirm User" checked), then they'll appear here automatically to
          assign a role.
        </div>
      )}
    </div>
  );
}
