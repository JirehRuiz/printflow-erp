import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatNumber, PRODUCT_TYPES } from "@/lib/constants";
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

  const cell = "border border-gray-800 px-2 py-1";
  const labelCell = `${cell} bg-gray-50 font-medium w-1/3`;

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-[13px] text-gray-900 print:p-0">
      <div className="mb-4 flex justify-end print:hidden">
        <PrintButton />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between pb-3">
        <CompanyLogo variant="print" />
        <div className="text-right">
          <h1 className="font-display text-base font-bold text-ink-900">
            SKYLAR ADVERTISING FZE LLC
          </h1>
          <p className="text-xs text-gray-600">Dubai Investments Park 2, Dubai, UAE</p>
          <p className="text-xs text-gray-600">Email: skylar.adservices@gmail.com</p>
          <p className="text-xs text-gray-600">Phone: 04-2949706 · Mobile: +971 55 251 7225</p>
        </div>
      </div>

      {/* Title bar */}
      <div className="border border-gray-800 py-1.5 text-center">
        <h2 className="text-lg font-bold tracking-wide text-ink-900">
          QUOTATION
          {quotation.version > 1 ? ` (Revision ${quotation.version})` : ""}
        </h2>
      </div>

      {/* Bill-to / quote meta, two columns */}
      <div className="mt-3 grid grid-cols-2 gap-0">
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className={labelCell}>Company Name</td>
              <td className={cell}>{customer?.company_name || customer?.name}</td>
            </tr>
            <tr>
              <td className={labelCell}>Address</td>
              <td className={cell}>{customer?.address || "—"}</td>
            </tr>
            <tr>
              <td className={labelCell}>TRN</td>
              <td className={cell}>{customer?.trn_number || ""}</td>
            </tr>
            <tr>
              <td className={labelCell}>Contact Person</td>
              <td className={cell}>{customer?.name}</td>
            </tr>
            <tr>
              <td className={labelCell}>Contact No</td>
              <td className={cell}>{customer?.phone || "—"}</td>
            </tr>
          </tbody>
        </table>

        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className={labelCell}>Quote No.</td>
              <td className={`${cell} font-semibold`}>{quotation.quote_number}</td>
            </tr>
            <tr>
              <td className={labelCell}>Quote Date</td>
              <td className={cell}>{formatDate(quotation.created_at)}</td>
            </tr>
            <tr>
              <td className={labelCell}>Valid Until</td>
              <td className={cell}>
                {quotation.valid_until ? formatDate(quotation.valid_until) : "N/A"}
              </td>
            </tr>
            <tr>
              <td className={labelCell}>Customer&apos;s PO No.</td>
              <td className={cell}>N/A</td>
            </tr>
            <tr>
              <td className={labelCell}>Status</td>
              <td className={`${cell} uppercase`}>{quotation.status}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Items table */}
      <table className="mt-3 w-full border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className={`${cell} w-10 text-center`}>NO.</th>
            <th className={cell}>DESCRIPTION OF ITEMS</th>
            <th className={`${cell} w-14 text-center`}>QTY</th>
            <th className={`${cell} w-24 text-right`}>UNIT PRICE</th>
            <th className={`${cell} w-28 text-right`}>AMOUNT (AED)</th>
          </tr>
        </thead>
        <tbody>
          {(items ?? []).map((item: any, i: number) => (
            <tr key={item.id}>
              <td className={`${cell} text-center align-top`}>{i + 1}</td>
              <td className={`${cell} align-top`}>
                <p className="font-medium">{item.description}</p>
                <p className="text-xs text-gray-500">
                  {productLabel(item.product_type)}
                  {item.material ? ` · ${item.material}` : ""}
                </p>
              </td>
              <td className={`${cell} text-center align-top`}>
                {item.qty} {item.unit}
              </td>
              <td className={`${cell} text-right align-top`}>{formatNumber(item.unit_price)}</td>
              <td className={`${cell} text-right align-top font-medium`}>
                {formatNumber(item.total_price)}
              </td>
            </tr>
          ))}
          <tr>
            <td className={`${cell} h-20`} colSpan={5}>
              {noVat && (
                <p className="text-xs italic text-gray-500">
                  Note: We are not registered for UAE VAT. No VAT has been charged on this
                  Quotation as our annual taxable turnover is below the mandatory registration
                  threshold.
                </p>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Amount in words / terms + totals */}
      <div className="grid grid-cols-2 gap-0">
        <table className="w-full border-collapse border-x border-b border-gray-800">
          <tbody>
            <tr>
              <td className="px-2 py-1 align-top text-xs">
                <span className="font-medium">AMOUNT IN WORDS:</span>{" "}
                {amountToWordsAED(quotation.total)}
              </td>
            </tr>
            <tr>
              <td className="px-2 py-1 text-xs">
                <span className="font-medium">TERMS:</span> {quotation.terms || "As agreed"}
              </td>
            </tr>
          </tbody>
        </table>

        <table className="w-full border-collapse border-r border-b border-gray-800">
          <tbody>
            <tr>
              <td className="border-b border-gray-800 px-2 py-1 font-medium">SUB-TOTAL</td>
              <td className="border-b border-gray-800 px-2 py-1 text-right">
                {formatCurrency(quotation.subtotal)}
              </td>
            </tr>
            {quotation.discount > 0 && (
              <tr>
                <td className="border-b border-gray-800 px-2 py-1 font-medium">DISCOUNT</td>
                <td className="border-b border-gray-800 px-2 py-1 text-right">
                  - {formatCurrency(quotation.discount)}
                </td>
              </tr>
            )}
            <tr>
              <td className="border-b border-gray-800 px-2 py-1 font-medium">
                {quotation.tax_percent}% VAT
              </td>
              <td className="border-b border-gray-800 px-2 py-1 text-right">
                {noVat ? "-" : formatCurrency(quotation.tax_amount)}
              </td>
            </tr>
            <tr>
              <td className="px-2 py-1.5 font-bold">GRAND TOTAL</td>
              <td className="px-2 py-1.5 text-right font-bold">
                {formatCurrency(quotation.total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bank details + signature */}
      <div className="mt-3 grid grid-cols-2 gap-0 border border-gray-800">
        <div className="border-r border-gray-800 p-3 text-xs">
          <p className="mb-1 font-semibold">Bank Details:</p>
          <p>
            Account Name: <span className="text-brand-700">SKYLAR ADVERTISING FZE LLC</span>
          </p>
          <p>Account No. 0033528255001</p>
          <p>IBAN No.: AE200400000033528255001</p>
          <p>Swift Code: NRAKAEAKXXX</p>
          <p>Bank: Ras Al Khaimah Bank (Rakbank)</p>
          <p>Address: Maktoum Street, Deira, Dubai UAE</p>
        </div>
        <div className="flex flex-col items-center justify-between p-3 text-center text-xs">
          <p className="font-semibold">For SKYLAR ADVERTISING FZE-LLC</p>
          <img
            src="/company-stamp.png"
            alt="Company Stamp"
            className="my-2 h-20 w-20 object-contain opacity-90"
          />
          <p className="w-full border-t border-gray-400 pt-1 text-gray-500">
            Authorized Signatory
          </p>
        </div>
      </div>
    </div>
  );
}
