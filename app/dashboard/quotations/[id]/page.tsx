import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, PRODUCT_TYPES } from "@/lib/constants";
import QuotationActions from "./quotation-actions";

function productLabel(value: string) {
  return PRODUCT_TYPES.find((p) => p.value === value)?.label ?? value;
}

export default async function QuotationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: quotation } = await supabase
    .from("quotations")
    .select(
      "id, quote_number, status, version, subtotal, discount, tax_percent, tax_amount, total, valid_until, terms, created_at, customer_id, customers(name, company_name, phone, email)"
    )
    .eq("id", params.id)
    .single();

  if (!quotation) notFound();

  const { data: items } = await supabase
    .from("quotation_items")
    .select("*")
    .eq("quotation_id", params.id)
    .order("sort_order");

  // Check whether a job order already exists for this quotation
  const { data: existingJob } = await supabase
    .from("job_orders")
    .select("id, job_number")
    .eq("quotation_id", params.id)
    .maybeSingle();

  const customer = quotation.customers as any;

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-brand-900">{quotation.quote_number}</h1>
            {quotation.version > 1 && (
              <span className="rounded-full bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700">
                Revision v{quotation.version}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {customer?.name} {customer?.company_name ? `· ${customer.company_name}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {quotation.status === "draft" && (
            <Link
              href={`/dashboard/quotations/${quotation.id}/edit`}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Edit
            </Link>
          )}
          <Link
            href={`/print/quotations/${quotation.id}`}
            target="_blank"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Print / PDF
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Unit Price</th>
                  <th className="px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {items?.map((item: any) => (
                  <tr key={item.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{item.description}</p>
                      {item.material && (
                        <p className="text-xs text-gray-400">
                          {item.material}
                          {item.width && item.height ? ` · ${item.width}x${item.height}` : ""}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{productLabel(item.product_type)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.qty} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatCurrency(item.unit_price)}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {formatCurrency(item.total_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {quotation.terms && (
            <div className="mt-4 rounded-xl border border-gray-100 bg-white p-4 text-sm text-gray-600 shadow-sm">
              <p className="mb-1 text-xs font-semibold uppercase text-gray-400">Terms & Notes</p>
              {quotation.terms}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-800">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>{formatCurrency(quotation.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Discount</span>
                <span>- {formatCurrency(quotation.discount)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Tax ({quotation.tax_percent}%)</span>
                <span>{formatCurrency(quotation.tax_amount)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-gray-100 pt-2 text-base font-semibold text-brand-900">
                <span>Total</span>
                <span>{formatCurrency(quotation.total)}</span>
              </div>
            </div>
          </div>

          <QuotationActions
            quotationId={quotation.id}
            status={quotation.status}
            customerId={quotation.customer_id}
            existingJob={existingJob}
          />
        </div>
      </div>
    </div>
  );
}
