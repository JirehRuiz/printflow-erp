import { createClient } from "@/lib/supabase/server";
import { PRODUCT_TYPES } from "@/lib/constants";
import CatalogTable from "./catalog-table";

export default async function CatalogPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: currentStaff } = await supabase
    .from("staff")
    .select("role")
    .eq("id", user?.id)
    .single();

  // Cost price / margin is sensitive — only admin and accounts see it.
  const canSeeCost = ["admin", "accounts"].includes(currentStaff?.role ?? "");
  // Sales can add/edit catalog items (pricing), but not delete them —
  // deleting could break historical quotations that reference an item.
  const canEdit = ["admin", "sales"].includes(currentStaff?.role ?? "");
  const canDelete = currentStaff?.role === "admin";

  const { data: items } = await supabase
    .from("catalog_items")
    .select("*")
    .order("product_type")
    .order("name");

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink-900">Catalog</h1>
      <p className="mt-1 text-sm text-gray-500">
        Standard materials and pricing. These populate the dropdowns when building a quotation.
      </p>

      <div className="mt-6">
        <CatalogTable
          items={items ?? []}
          productTypes={PRODUCT_TYPES}
          canSeeCost={canSeeCost}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      </div>

      {canEdit && !canDelete && (
        <p className="mt-4 text-xs text-gray-400">
          You can add and edit catalog items. Only admins can delete an item or see cost/margin.
        </p>
      )}
    </div>
  );
}
