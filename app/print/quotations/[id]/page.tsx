import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatNumber, PRODUCT_TYPES } from "@/lib/constants";
import CurrencyAmount from "@/components/currency-amount";
import { amountToWordsAED } from "@/lib/number-to-words";
import CompanyLogo from "@/components/company-logo";
import PrintButton from "./print-button";

function productLabel(value: string) {
  return PRODUCT_TYPES.find((p) => p.value === value)?.label ?? value;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function InfoRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-gray-100 py-1 last:border-0">
      <span className="text-[10px] uppercase tracking-wide text-gray-400">{label}</span>
      <span className={`text-right text-xs text-gray-800 ${bold ? "font-semibold" : ""}`}>
        {value}
      </span>
    </div>
  );
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
      `quote_number, status, version, subtotal, discount, tax_percent, tax_amount, total,
       valid_until, terms, created_at,
       customers(name, company_name, phone, email, address, trn_number)`
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
  const noVat = quotation.tax_amount === 0;

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    sent: "bg-amber-50 text-amber-700",
    approved: "bg-green-50 text-green-700",
    rejected: "bg-red-50 text-red-700",
    revised: "bg-purple-50 text-purple-700",
  };

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-[13px] text-gray-800">
      <div className="mb-4 flex justify-end print:hidden">
        <PrintButton />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between border-b border-gray-100 pb-3">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/arabic-tagline.png" alt="" className="mb-1 h-3 w-auto" />
          <CompanyLogo variant="print" />
        </div>
        <div className="text-right">
          <h1 className="font-display text-sm font-bold text-ink-900">
            SKYLAR ADVERTISING FZE LLC
          </h1>
          <p className="mt-0.5 text-[10px] text-gray-500">Dubai Investments Park 2, Dubai, UAE</p>
          <p className="text-[10px] text-gray-500">skylar.adservices@gmail.com</p>
          <p className="text-[10px] text-gray-500">04-2949706 · +971 55 251 7225</p>
        </div>
      </div>

      {/* Title */}
      <div className="mt-2 flex items-center justify-between">
        <h2 className="font-display text-base font-bold tracking-tight text-ink-900">
          Quotation
          {quotation.version > 1 ? (
            <span className="ml-2 text-sm font-medium text-gray-400">
              Revision {quotation.version}
            </span>
          ) : null}
        </h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${statusColors[quotation.status]}`}
        >
          {quotation.status}
        </span>
      </div>

      {/* Bill-to / quote meta */}
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-gray-50 p-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-brand-600">
            Bill To
          </p>
          <InfoRow label="Company" value={customer?.company_name || customer?.name} bold />
          <InfoRow label="Address" value={customer?.address || "—"} />
          <InfoRow label="TRN" value={customer?.trn_number || "—"} />
          <InfoRow label="Contact Person" value={customer?.name} />
          <InfoRow label="Contact No" value={customer?.phone || "—"} />
        </div>

        <div className="rounded-xl bg-gray-50 p-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-brand-600">
            Quotation Details
          </p>
          <InfoRow label="Quote No." value={quotation.quote_number} bold />
          <InfoRow label="Quote Date" value={formatDate(quotation.created_at)} />
          <InfoRow
            label="Valid Until"
            value={quotation.valid_until ? formatDate(quotation.valid_until) : "N/A"}
          />
          <InfoRow label="Customer's PO No." value="N/A" />
        </div>
      </div>

      {/* Items table */}
      <table className="mt-5 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-gray-800 text-left text-[11px] uppercase tracking-wide text-gray-500">
            <th className="w-8 py-2">No.</th>
            <th className="py-2">Description of Items</th>
            <th className="py-2 text-center">Qty</th>
            <th className="py-2 text-right">Unit Price</th>
            <th className="py-2 text-right">Amount (D)</th>
          </tr>
        </thead>
        <tbody>
          {(items ?? []).map((item: any, i: number) => (
            <tr key={item.id} className="border-b border-gray-100">
              <td className="py-1.5 align-top text-gray-400">{i + 1}</td>
              <td className="py-1.5 align-top">
                <p className="font-medium text-gray-800">{item.description}</p>
                <p className="text-xs text-gray-400">
                  {productLabel(item.product_type)}
                  {item.material ? ` · ${item.material}` : ""}
                </p>
              </td>
              <td className="py-1.5 text-center align-top text-gray-600">
                {item.qty} {item.unit}
              </td>
              <td className="py-1.5 text-right align-top text-gray-600">
                {formatNumber(item.unit_price)}
              </td>
              <td className="py-1.5 text-right align-top font-medium text-gray-800">
                {formatNumber(item.total_price)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {noVat && (
        <p className="mt-3 text-xs italic text-gray-400">
          Note: We are not registered for UAE VAT. No VAT has been charged on this quotation as
          our annual taxable turnover is below the mandatory registration threshold.
        </p>
      )}

      {/* Amount in words / terms + totals */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-gray-50 p-3 text-[11px] leading-relaxed text-gray-600">
          <p className="mb-2">
            <span className="font-semibold uppercase tracking-wide text-gray-500">
              Amount in Words:{" "}
            </span>
            {amountToWordsAED(quotation.total)}
          </p>
          <p>
            <span className="font-semibold uppercase tracking-wide text-gray-500">
              Terms:{" "}
            </span>
            {quotation.terms || "As agreed"}
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 p-3">
          <div className="flex justify-between border-b border-gray-100 py-1.5 text-xs text-gray-500">
            <span>Sub-Total</span>
            <CurrencyAmount amount={quotation.subtotal} />
          </div>
          {quotation.discount > 0 && (
            <div className="flex justify-between border-b border-gray-100 py-1.5 text-xs text-gray-500">
              <span>Discount</span>
              <span className="inline-flex items-center gap-1">- <CurrencyAmount amount={quotation.discount} /></span>
            </div>
          )}
          <div className="flex justify-between border-b border-gray-100 py-1.5 text-xs text-gray-500">
            <span>{quotation.tax_percent}% VAT</span>
            <span>{noVat ? "-" : <CurrencyAmount amount={quotation.tax_amount} />}</span>
          </div>
          <div className="flex justify-between border-b-2 border-ink-900 py-2 text-sm font-bold text-ink-900">
            <span>Grand Total</span>
            <CurrencyAmount amount={quotation.total} />
          </div>
        </div>
      </div>

      {/* Bank details + signature */}
      <div className="mt-5 grid grid-cols-1 gap-0 overflow-hidden rounded-xl border border-gray-100 sm:grid-cols-2">
        <div className="border-b border-gray-100 p-3 text-[11px] leading-relaxed text-gray-600 sm:border-b-0 sm:border-r">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Bank Details
          </p>
          <p>
            Account Name: <span className="text-brand-700">SKYLAR ADVERTISING FZE LLC</span>
          </p>
          <p>Account No. 0033528255001</p>
          <p>IBAN No.: AE200400000033528255001</p>
          <p>Swift Code: NRAKAEAKXXX</p>
          <p>Bank: Ras Al Khaimah Bank (Rakbank)</p>
          <p>Address: Maktoum Street, Deira, Dubai UAE</p>
        </div>
        <div className="flex flex-col items-center justify-between p-3 text-center text-[11px]">
          <p className="font-semibold text-gray-700">For SKYLAR ADVERTISING FZE-LLC</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/company-stamp.png"
            alt="Company Stamp"
            className="my-2 h-32 w-32 object-contain opacity-90"
          />
          <p className="w-full border-t border-gray-200 pt-1 text-gray-400">
            Authorized Signatory
          </p>
        </div>
      </div>
    </div>
  );
}
