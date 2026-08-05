import { createClient } from "@/lib/supabase/server";
import InventoryTable from "./inventory-table";

export default async function InventoryPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: currentStaff } = await supabase
    .from("staff")
    .select("role")
    .eq("id", user?.id)
    .single();

  const canSeeCost = ["admin", "accounts"].includes(currentStaff?.role ?? "");
  const canEdit = ["admin", "production"].includes(currentStaff?.role ?? "");
  const canDelete = currentStaff?.role === "admin";

  const [{ data: items }, { data: suppliers }] = await Promise.all([
    supabase
      .from("inventory_items")
      .select("*, suppliers(name)")
      .order("name"),
    supabase.from("suppliers").select("id, name").eq("is_active", true).order("name"),
  ]);

  const lowStockCount = (items ?? []).filter(
    (i: any) => i.is_active && i.quantity_on_hand <= i.reorder_level
  ).length;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Inventory</h1>
          <p className="mt-1 text-sm text-gray-500">
            Actual stock on hand — separate from the Catalog, which is just pricing.
          </p>
        </div>
        {lowStockCount > 0 && (
          <span className="rounded-full bg-magenta-50 px-3 py-1.5 text-sm font-medium text-magenta-600">
            ⚠ {lowStockCount} item{lowStockCount !== 1 ? "s" : ""} low on stock
          </span>
        )}
      </div>

      <div className="mt-6">
        <InventoryTable
          items={items ?? []}
          suppliers={suppliers ?? []}
          canSeeCost={canSeeCost}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      </div>
    </div>
  );
}
