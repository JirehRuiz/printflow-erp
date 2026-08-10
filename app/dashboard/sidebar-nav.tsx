"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  Users,
  FileText,
  Boxes,
  Factory,
  Wallet,
  LineChart,
  UserCog,
  Tags,
  Package,
  Truck,
  Receipt,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/leads", label: "Leads", icon: Target },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/quotations", label: "Quotations", icon: FileText },
  { href: "/dashboard/jobs", label: "Job Orders", icon: Boxes },
  { href: "/dashboard/production", label: "Production", icon: Factory },
  { href: "/dashboard/inventory", label: "Inventory", icon: Package },
  { href: "/dashboard/suppliers", label: "Suppliers", icon: Truck },
  { href: "/dashboard/invoices", label: "Invoices", icon: Wallet },
  { href: "/dashboard/expenses", label: "Expenses", icon: Receipt, roles: ["admin", "accounts"] },
  { href: "/dashboard/catalog", label: "Catalog", icon: Tags },
  { href: "/dashboard/reports", label: "Reports", icon: LineChart },
  { href: "/dashboard/staff", label: "Staff", icon: UserCog },
];

export default function SidebarNav({ role }: { role: string }) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <nav className="space-y-1">
      {visibleItems.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-ink-800 text-white"
                : "text-gray-400 hover:bg-ink-800/60 hover:text-white"
            }`}
          >
            <Icon size={17} strokeWidth={2} className={isActive ? "text-brand-500" : ""} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
