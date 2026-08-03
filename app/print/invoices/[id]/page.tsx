import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, PRODUCT_TYPES } from "@/lib/constants";
import LogoMark from "@/components/logo-mark";
import PrintButton from "./print-button";

function productLabel(value: string) {
  return PRODUCT_TYPES.find((p) => p.value === value)?.label ?? value;
}

export default async function InvoicePrintPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "invoice_number, status, subtotal, tax_amount, total, amount_paid, due_date, created_at, job_orders(job_number, quotation_id), customers(name, company_name, phone, email, address)"
    )
    .eq("id", params.id)
    .single();

  if (!invoice) notFound();

  const jobOrder = invoice.job_orders as any;

  const [{ data: payments }, { data: items }] = await Promise.all([
    supabase
      .from("payments")
      .select("amount, method, reference_no, paid_at")
      .eq("invoice_id", params.id)
      .order("paid_at", { ascending: true }),
    jobOrder?.quotation_id
      ? supabase
          .from("quotation_items")
          .select("*")
          .eq("quotation_id", jobOrder.quotation_id)
          .order("sort_order")
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const customer = invoice.customers as any;
  const balance = invoice.total - invoice.amount_paid;

  const statusColors: Record<string, string> = {
    unpaid: "bg-red-50 text-red-700",
    partial: "bg-amber-50 text-amber-700",
    paid: "bg-green-50 text-green-700",
    overdue: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-500",
  };

  return (
    <div className="mx-auto max-w-3xl bg-white p-10 text-gray-800 print:p-0">
      <div className="mb-6 flex justify-end print:hidden">
        <PrintButton />
      </div>

      <div className="flex items-start justify-between border-b border-gray-200 pb-6">
        <div>
          <div className="mb-2">
            <LogoMark size={36} />
          </div>
          <h1 className="font-display text-lg font-semibold text-ink-900">Your Company Name</h1>
          <p className="text-xs text-gray-400">Digital Printing · Signage · Fabrication</p>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold text-ink-900">INVOICE</h2>
          <p className="text-sm text-gray-500">{invoice.invoice_number}</p>
          {jobOrder?.job_number && (
            <p className="mt-1 text-xs text-gray-400">Job: {jobOrder.job_number}</p>
          )}
          <p className="text-xs text-gray-400">
            Date: {new Date(invoice.created_at).toLocaleDateString()}
          </p>
          {invoice.due_date && (
            <p className="text-xs text-gray-400">
              Due: {new Date(invoice.due_date).toLocaleDateString()}
            </p>
          )}
          <span
            className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-medium ${statusColors[invoice.status]}`}
          >
            {invoice.status.toUpperCase()}
          </span>
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

      {items && items.length > 0 && (
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
            {items.map((item: any) => (
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
      )}

      <div className="mt-6 flex justify-end">
        <div className="w-72 space-y-1 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Tax</span>
            <span>{formatCurrency(invoice.tax_amount)}</span>
          </div>
          <div className="flex justify-between border-t-2 border-gray-800 pt-1 text-base font-bold text-ink-900">
            <span>Total</span>
            <span>{formatCurrency(invoice.total)}</span>
          </div>
          <div className="flex justify-between text-green-700">
            <span>Paid</span>
            <span>{formatCurrency(invoice.amount_paid)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold text-red-600">
            <span>Balance Due</span>
            <span>{formatCurrency(balance)}</span>
          </div>
        </div>
      </div>

      {payments && payments.length > 0 && (
        <div className="mt-8 border-t border-gray-100 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Payment History</p>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                <th className="py-1">Date</th>
                <th className="py-1">Method</th>
                <th className="py-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-1">{new Date(p.paid_at).toLocaleDateString()}</td>
                  <td className="py-1 capitalize text-gray-500">{p.method?.replace("_", " ")}</td>
                  <td className="py-1 text-right">{formatCurrency(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-12 flex justify-between text-xs text-gray-400">
        <div>
          <p className="w-40 border-t border-gray-300 pt-2">Prepared by</p>
        </div>
        <div>
          <p className="w-40 border-t border-gray-300 pt-2">Received by</p>
        </div>
      </div>
    </div>
  );
}
