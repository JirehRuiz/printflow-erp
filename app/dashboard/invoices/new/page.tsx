import { createClient } from "@/lib/supabase/server";
import NewInvoiceForm from "./new-invoice-form";

export default async function NewInvoicePage() {
  const supabase = createClient();

  // Job orders that don't already have an invoice — left join + filter null
  const { data: jobOrders } = await supabase
    .from("job_orders")
    .select(
      "id, job_number, status, customer_id, customers(name), quotations(total, subtotal, tax_amount), invoices(id)"
    )
    .order("created_at", { ascending: false });

  const availableJobs = (jobOrders ?? []).filter((j: any) => !j.invoices || j.invoices.length === 0);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink-900">New Invoice</h1>
      <p className="mt-1 text-sm text-gray-500">
        Pick a job order to invoice. Amounts are pre-filled from its quotation — adjust if needed.
      </p>

      <div className="mt-6">
        <NewInvoiceForm jobOrders={availableJobs} />
      </div>
    </div>
  );
}
