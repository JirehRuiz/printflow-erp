import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QuotationForm from "../../quotation-form";

export default async function EditQuotationPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: quotation } = await supabase
    .from("quotations")
    .select("id, customer_id, valid_until, tax_percent, discount, terms, status")
    .eq("id", params.id)
    .single();

  if (!quotation) notFound();

  // Only drafts can be edited directly — sent/approved quotes should go
  // through the "Create Revision" workflow instead, to preserve history.
  if (quotation.status !== "draft") {
    redirect(`/dashboard/quotations/${params.id}`);
  }

  const { data: items } = await supabase
    .from("quotation_items")
    .select("product_type, description, material, width, height, unit, qty, unit_price")
    .eq("quotation_id", params.id)
    .order("sort_order");

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, company_name")
    .order("name");

  const formattedItems = (items ?? []).map((item) => ({
    product_type: item.product_type,
    description: item.description,
    material: item.material ?? "",
    width: item.width?.toString() ?? "",
    height: item.height?.toString() ?? "",
    unit: item.unit,
    qty: item.qty.toString(),
    unit_price: item.unit_price.toString(),
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-brand-900">Edit Quotation</h1>
      <p className="mt-1 text-sm text-gray-500">
        Only drafts can be edited directly — once sent, use "Create Revision" instead.
      </p>

      <div className="mt-6">
        <QuotationForm
          customers={customers ?? []}
          existingQuotation={{
            id: quotation.id,
            customer_id: quotation.customer_id,
            valid_until: quotation.valid_until,
            tax_percent: quotation.tax_percent,
            discount: quotation.discount,
            terms: quotation.terms,
            items: formattedItems,
          }}
        />
      </div>
    </div>
  );
}
