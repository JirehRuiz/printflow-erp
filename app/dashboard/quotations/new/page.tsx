import { createClient } from "@/lib/supabase/server";
import QuotationForm from "../quotation-form";

export default async function NewQuotationPage() {
  const supabase = createClient();

  const [{ data: customers }, { data: catalogItems }] = await Promise.all([
    supabase.from("customers").select("id, name, company_name").order("name"),
    supabase
      .from("catalog_items")
      .select("id, product_type, name, description, material, unit, selling_price")
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink-900">New Quotation</h1>
      <p className="mt-1 text-sm text-gray-500">
        Pick a product type, then choose from the catalog — or enter a custom item.
      </p>

      <div className="mt-6">
        <QuotationForm customers={customers ?? []} catalogItems={catalogItems ?? []} />
      </div>
    </div>
  );
}
