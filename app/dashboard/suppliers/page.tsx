import { createClient } from "@/lib/supabase/server";
import SupplierTable from "./supplier-table";

export default async function SuppliersPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: currentStaff } = await supabase
    .from("staff")
    .select("role")
    .eq("id", user?.id)
    .single();

  const canEdit = ["admin", "production"].includes(currentStaff?.role ?? "");
  const canDelete = currentStaff?.role === "admin";

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .order("name");

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink-900">Suppliers</h1>
      <p className="mt-1 text-sm text-gray-500">
        Where your materials come from — link inventory items to a supplier for quick reordering.
      </p>

      <div className="mt-6">
        <SupplierTable suppliers={suppliers ?? []} canEdit={canEdit} canDelete={canDelete} />
      </div>
    </div>
  );
}
