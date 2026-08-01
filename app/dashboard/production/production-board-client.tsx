"use client";

import { useMemo, useState } from "react";
import { PRODUCTION_STAGES } from "@/lib/constants";
import ProductionCard from "./production-card";

export default function ProductionBoardClient({ orders }: { orders: any[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter((o) => {
      const haystack = [
        o.job_orders?.job_number,
        o.job_orders?.customers?.name,
        o.staff?.full_name,
        o.machine_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [orders, search]);

  const grouped: Record<string, any[]> = {};
  PRODUCTION_STAGES.forEach((s) => (grouped[s.value] = []));
  filtered.forEach((o: any) => {
    if (o.status !== "completed") {
      grouped[o.stage]?.push(o);
    }
  });

  const activeCount = orders.filter((o) => o.status !== "completed").length;

  return (
    <div>
      <div className="mt-4 mb-2 flex items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search job #, customer, operator, machine..."
          className="w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-xs font-medium text-gray-400 hover:text-gray-600"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">{activeCount} active</span>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {PRODUCTION_STAGES.map((stage) => (
          <div key={stage.value} className="w-64 flex-shrink-0">
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-gray-700">{stage.label}</h2>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                {grouped[stage.value]?.length ?? 0}
              </span>
            </div>

            <div className="space-y-3">
              {grouped[stage.value]?.length ? (
                grouped[stage.value].map((order) => (
                  <ProductionCard key={order.id} order={order} />
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-gray-200 bg-white/50 p-4 text-center text-xs text-gray-300">
                  {search ? "No matches" : "Empty"}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
