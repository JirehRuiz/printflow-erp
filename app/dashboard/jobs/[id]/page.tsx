import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/constants";
import JobStatusControl from "./job-status-control";
import ProductionSection from "./production-section";
import QualityCheckSection from "./quality-check-section";
import DeliverySection from "./delivery-section";
import InvoiceSection from "./invoice-section";

export default async function JobOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: job } = await supabase
    .from("job_orders")
    .select(
      "id, job_number, status, priority, due_date, notes, created_at, quotation_id, customer_id, customers(name, company_name, phone), quotations(quote_number, total, tax_amount, subtotal)"
    )
    .eq("id", params.id)
    .single();

  if (!job) notFound();

  const [
    { data: productionOrders },
    { data: qualityChecks },
    { data: delivery },
    { data: invoice },
    { data: staffList },
  ] = await Promise.all([
    supabase
      .from("production_orders")
      .select("id, stage, status, machine_name, operator_id, started_at, completed_at")
      .eq("job_order_id", job.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("quality_checks")
      .select("id, passed, remarks, checked_at")
      .eq("job_order_id", job.id)
      .order("checked_at", { ascending: false })
      .limit(1),
    supabase
      .from("deliveries")
      .select("id, status, delivery_date, received_by_name")
      .eq("job_order_id", job.id)
      .maybeSingle(),
    supabase
      .from("invoices")
      .select("id, invoice_number, status, total, amount_paid")
      .eq("job_order_id", job.id)
      .maybeSingle(),
    supabase
      .from("staff")
      .select("id, full_name, role")
      .eq("is_active", true)
      .order("full_name"),
  ]);

  const customer = job.customers as any;
  const quotation = job.quotations as any;
  const latestCheck = qualityChecks?.[0] ?? null;

  // Is the "ready" stage completed? (gates whether QC can happen)
  const readyStageDone = productionOrders?.some(
    (p) => p.stage === "ready" && p.status === "completed"
  );

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-900">{job.job_number}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {customer?.name} {customer?.company_name ? `· ${customer.company_name}` : ""}
          </p>
        </div>
        <Link
          href={`/dashboard/quotations/${job.quotation_id}`}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          View Source Quotation →
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-800">Job Details</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs uppercase text-gray-400">Quotation</dt>
                <dd className="mt-1 text-gray-700">{quotation?.quote_number ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-gray-400">Order Value</dt>
                <dd className="mt-1 font-medium text-gray-800">
                  {formatCurrency(quotation?.total ?? 0)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-gray-400">Priority</dt>
                <dd className="mt-1 capitalize text-gray-700">{job.priority}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-gray-400">Due Date</dt>
                <dd className="mt-1 text-gray-700">
                  {job.due_date ? new Date(job.due_date).toLocaleDateString() : "Not set"}
                </dd>
              </div>
            </dl>
          </div>

          <ProductionSection
            jobOrderId={job.id}
            productionOrders={productionOrders ?? []}
            staffList={staffList ?? []}
          />

          {readyStageDone && (
            <QualityCheckSection jobOrderId={job.id} latestCheck={latestCheck} />
          )}

          {latestCheck?.passed && (
            <DeliverySection jobOrderId={job.id} delivery={delivery ?? null} />
          )}

          {delivery?.status === "delivered" && (
            <InvoiceSection
              jobOrderId={job.id}
              customerId={job.customer_id}
              quotation={quotation}
              invoice={invoice ?? null}
            />
          )}
        </div>

        <div>
          <JobStatusControl jobId={job.id} status={job.status} dueDate={job.due_date} />
        </div>
      </div>
    </div>
  );
}
