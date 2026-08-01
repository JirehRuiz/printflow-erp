import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CustomerForm from "../customer-form";

export default async function EditCustomerPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, company_name, phone, email, address, trn_number, source, notes")
    .eq("id", params.id)
    .single();

  if (!customer) notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-brand-900">{customer.name}</h1>
      <p className="mt-1 text-sm text-gray-500">Edit customer details.</p>

      <div className="mt-6">
        <CustomerForm customer={customer} />
      </div>
    </div>
  );
}
