import { createClient } from "@/lib/supabase/server";
import QuotationForm from "../quotation-form";

export default async function NewQuotationPage() {
  const supabase = createClient();

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, company_name")
    .order("name");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-brand-900">New Quotation</h1>
      <p className="mt-1 text-sm text-gray-500">
        Add line items for each product type — totals calculate automatically.
      </p>

      <div className="mt-6">
        <QuotationForm customers={customers ?? []} />
      </div>
    </div>
  );
}
