import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import StockAdjustForm from "./stock-adjust-form";

export default async function InventoryItemPage({
  params,
}: {
  params: { id: string };
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

  const canSeeCost = ["admin", "accounts"].includes(currentStaff?.role ?? "");
  const canEdit = ["admin", "production"].includes(currentStaff?.role ?? "");

  const { data: item } = await supabase
    .from("inventory_items")
    .select("*, suppliers(id, name, phone, email)")
    .eq("id", params.id)
    .single();

  if (!item) notFound();

  const { data: movements } = await supabase
    .from("stock_movements")
    .select("id, movement_type, quantity_change, reference, notes, created_at, staff(full_name)")
    .eq("inventory_item_id", params.id)
    .order("created_at", { ascending: false });

  const { data: linkedCatalogItems } = await supabase
    .from("catalog_items")
    .select("id, name, consumption_per_unit, unit")
    .eq("inventory_item_id", params.id)
    .eq("is_active", true);

  const supplier = item.suppliers as any;
  const isLow = item.quantity_on_hand <= item.reorder_level;

  const typeColors: Record<string, string> = {
    stock_in: "bg-green-50 text-green-700",
    stock_out: "bg-red-50 text-red-700",
    adjustment: "bg-amber-50 text-amber-700",
  };

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">{item.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{item.category ?? "Uncategorized"}</p>
        </div>
        <Link
          href="/dashboard/inventory"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          ← Back to Inventory
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200/70 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-gray-800">Stock Movement History</h2>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Qty Change</th>
                  <th className="px-4 py-2">Reference</th>
                  <th className="px-4 py-2">By</th>
                </tr>
              </thead>
              <tbody>
                {movements && movements.length > 0 ? (
                  movements.map((m: any) => (
                    <tr key={m.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-2 text-gray-500">
                        {new Date(m.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeColors[m.movement_type]}`}
                        >
                          {m.movement_type.replace("_", " ")}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-2 tabular-nums font-medium ${
                          m.quantity_change >= 0 ? "text-green-700" : "text-red-600"
                        }`}
                      >
                        {m.quantity_change >= 0 ? "+" : ""}
                        {m.quantity_change} {item.unit}
                      </td>
                      <td className="px-4 py-2 text-gray-500">{m.reference ?? "—"}</td>
                      <td className="px-4 py-2 text-gray-400">{m.staff?.full_name ?? "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      No movements recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200/70 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-800">Current Stock</h2>
            <p
              className={`tabular-nums font-display text-3xl font-semibold ${
                isLow ? "text-magenta-600" : "text-ink-900"
              }`}
            >
              {item.quantity_on_hand} <span className="text-base font-normal">{item.unit}</span>
            </p>
            {isLow && (
              <p className="mt-1 text-xs font-medium text-magenta-600">
                ⚠ At or below reorder level ({item.reorder_level} {item.unit})
              </p>
            )}
            {canSeeCost && (
              <p className="mt-3 text-sm text-gray-500">
                Unit Cost: <span className="font-medium text-gray-700">{item.unit_cost.toFixed(2)}</span>
              </p>
            )}
            {supplier && (
              <div className="mt-3 border-t border-gray-100 pt-3 text-sm">
                <p className="text-xs uppercase text-gray-400">Supplier</p>
                <p className="font-medium text-gray-700">{supplier.name}</p>
                {supplier.phone && <p className="text-gray-500">{supplier.phone}</p>}
              </div>
            )}
          </div>

          {linkedCatalogItems && linkedCatalogItems.length > 0 && (
            <div className="rounded-xl border border-gray-200/70 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-gray-800">
                Auto-Deducted By
              </h2>
              <div className="space-y-2 text-sm">
                {linkedCatalogItems.map((c) => (
                  <div key={c.id} className="flex justify-between">
                    <span className="text-gray-700">{c.name}</span>
                    <span className="text-gray-400">
                      {c.consumption_per_unit} {item.unit} / {c.unit}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Stock deducts automatically when a job using one of these catalog items starts
                production.
              </p>
            </div>
          )}

          {canEdit && <StockAdjustForm inventoryItemId={item.id} unit={item.unit} />}
        </div>
      </div>
    </div>
  );
}
