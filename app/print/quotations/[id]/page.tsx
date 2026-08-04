import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, PRODUCT_TYPES } from "@/lib/constants";
import CompanyLogo from "@/components/company-logo";
import PrintButton from "./print-button";

function productLabel(value: string) {
  return PRODUCT_TYPES.find((p) => p.value === value)?.label ?? value;
}

export default async function QuotationPrintPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: quotation } = await supabase
    .from("quotations")
    .select(
      "quote_number, status, version, subtotal, discount, tax_percent, tax_amount, total, valid_until, terms, created_at, customers(name, company_name, phone, email, address)"
    )
    .eq("id", params.id)
    .single();

  if (!quotation) notFound();

  const { data: items } = await supabase
    .from("quotation_items")
    .select("*")
    .eq("quotation_id", params.id)
    .order("sort_order");

  const customer = quotation.customers as any;

  return (
    <div className="mx-auto max-w-3xl bg-white p-10 text-gray-800 print:p-0">
      <div className="mb-6 flex justify-end print:hidden">
        <PrintButton />
      </div>

      <div className="flex items-start justify-between border-b border-gray-200 pb-6">
        <div>
          <div className="mb-2">
            <CompanyLogo variant="print" />
          </div>
          <h1 className="font-display text-lg font-semibold text-ink-900">
            Skylar Advertising FZE-LLC
          </h1>
          <p className="text-xs text-gray-400">Digital Printing · Signage · Fabrication</p>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold text-brand-900">QUOTATION</h2>
          <p className="text-sm text-gray-500">
            {quotation.quote_number}
            {quotation.version > 1 ? ` (v${quotation.version})` : ""}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Date: {new Date(quotation.created_at).toLocaleDateString()}
          </p>
          {quotation.valid_until && (
            <p className="text-xs text-gray-400">
              Valid until: {new Date(quotation.valid_until).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase text-gray-400">Bill To</p>
        <p className="mt-1 font-medium text-gray-800">{customer?.name}</p>
        {customer?.company_name && <p className="text-sm text-gray-500">{customer.company_name}</p>}
        {customer?.address && <p className="text-sm text-gray-500">{customer.address}</p>}
        {customer?.phone && <p className="text-sm text-gray-500">{customer.phone}</p>}
        {customer?.email && <p className="text-sm text-gray-500">{customer.email}</p>}
      </div>

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-gray-800 text-left text-xs uppercase text-gray-500">
            <th className="py-2">Description</th>
            <th className="py-2">Type</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Unit Price</th>
            <th className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {items?.map((item: any) => (
            <tr key={item.id} className="border-b border-gray-100">
              <td className="py-2">
                <p className="font-medium">{item.description}</p>
                {item.material && (
                  <p className="text-xs text-gray-400">
                    {item.material}
                    {item.width && item.height ? ` · ${item.width}x${item.height}` : ""}
                  </p>
                )}
              </td>
              <td className="py-2 text-gray-500">{productLabel(item.product_type)}</td>
              <td className="py-2 text-right">
                {item.qty} {item.unit}
              </td>
              <td className="py-2 text-right">{formatCurrency(item.unit_price)}</td>
              <td className="py-2 text-right font-medium">{formatCurrency(item.total_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <div className="w-64 space-y-1 text-sm">
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
          <div className="flex justify-between border-t-2 border-gray-800 pt-1 text-base font-bold text-brand-900">
            <span>Total</span>
            <span>{formatCurrency(quotation.total)}</span>
          </div>
        </div>
      </div>

      {quotation.terms && (
        <div className="mt-8 border-t border-gray-100 pt-4 text-xs text-gray-500">
          <p className="mb-1 font-semibold uppercase text-gray-400">Terms & Notes</p>
          {quotation.terms}
        </div>
      )}

      <div className="mt-12 flex justify-between text-xs text-gray-400">
        <div>
          <p className="border-t border-gray-300 pt-2 w-40">Prepared by</p>
        </div>
        <div>
          <p className="border-t border-gray-300 pt-2 w-40">Customer Approval</p>
        </div>
      </div>
    </div>
  );
}
