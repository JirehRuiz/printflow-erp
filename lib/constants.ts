export const PRODUCT_TYPES = [
  { value: "design_layout", label: "Design & Layout" },
  { value: "digital_printing", label: "Digital Printing" },
  { value: "large_format", label: "Large Format Printing" },
  { value: "signage", label: "Signage" },
  { value: "acrylic_fabrication", label: "Acrylic Fabrication" },
  { value: "cnc", label: "CNC" },
  { value: "laser_cutting", label: "Laser Cutting" },
  { value: "uv_printing", label: "UV Printing" },
  { value: "sticker_printing", label: "Sticker Printing" },
  { value: "vehicle_wrap", label: "Vehicle Wrap" },
  { value: "exhibition_stand", label: "Exhibition Stand" },
  { value: "other", label: "Other" },
] as const;

export const STAFF_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "sales", label: "Sales" },
  { value: "production", label: "Production" },
  { value: "qc", label: "Quality Control" },
  { value: "accounts", label: "Accounts" },
  { value: "delivery", label: "Delivery" },
] as const;

export const EXPENSE_CATEGORIES = [
  "Rent",
  "Salaries & Wages",
  "Utilities",
  "Fuel & Transport",
  "Marketing & Advertising",
  "Office Supplies",
  "Equipment & Maintenance",
  "Bank Charges",
  "Professional Fees",
  "Insurance",
  "Miscellaneous",
];

export const PAYMENT_METHODS = ["cash", "bank_transfer", "card", "cheque"];

// The four funds tracked on the Finance > Funds tab. These exact names are
// used both for fund inflows and for Expenses -> Source of Fund, so an
// expense tagged to a fund reduces that specific fund's balance.
export const FUND_SOURCES = [
  "Petty Cash",
  "Manager's Fund",
  "Daily Sales",
  "Other Fund",
];

// Visual identity per fund (static class strings so Tailwind picks them up)
export const FUND_STYLES: Record<string, { dot: string; badge: string }> = {
  "Petty Cash": { dot: "bg-brand-500", badge: "bg-brand-50 text-brand-700" },
  "Manager's Fund": { dot: "bg-purple-500", badge: "bg-purple-50 text-purple-700" },
  "Daily Sales": { dot: "bg-green-500", badge: "bg-green-50 text-green-700" },
  "Other Fund": { dot: "bg-gray-400", badge: "bg-gray-100 text-gray-600" },
};

// Matches any free-text value (case-insensitive) to one of the four funds.
// Returns null if it doesn't match (e.g. legacy values like "Cashier").
export function matchFund(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  return FUND_SOURCES.find((f) => f.toLowerCase() === v) ?? null;
}

export const PRODUCTION_STAGES = [
  { value: "design", label: "Design" },
  { value: "printing", label: "Printing" },
  { value: "cutting", label: "Cutting" },
  { value: "laser_cnc", label: "Laser / CNC" },
  { value: "uv", label: "UV Printing" },
  { value: "finishing", label: "Finishing" },
  { value: "assembly", label: "Assembly" },
  { value: "ready", label: "Ready for Delivery" },
] as const;

export const UNITS = ["pcs", "sqft", "sqm", "rft", "set", "hrs"];

export function formatCurrency(amount: number) {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `D ${formatted}`;
}

// Plain number with thousands separators, no currency symbol — used in
// printed document line-items where the column header already says "D".
export function formatNumber(amount: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
