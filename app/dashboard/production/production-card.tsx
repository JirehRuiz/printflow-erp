"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PRODUCTION_STAGES } from "@/lib/constants";

const statusColors: Record<string, string> = {
  not_started: "bg-gray-100 text-gray-500",
  in_progress: "bg-blue-50 text-blue-700",
  paused: "bg-amber-50 text-amber-700",
  completed: "bg-green-50 text-green-700",
};

export default function ProductionCard({ order }: { order: any }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const currentIndex = PRODUCTION_STAGES.findIndex((s) => s.value === order.stage);
  const nextStage = PRODUCTION_STAGES[currentIndex + 1];

  async function startWork() {
    setLoading(true);
    await supabase
      .from("production_orders")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("id", order.id);
    setLoading(false);
    router.refresh();
  }

  async function moveToNextStage() {
    setLoading(true);

    // Mark current stage completed
    await supabase
      .from("production_orders")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", order.id);

    if (nextStage) {
      // Create the next stage row
      await supabase.from("production_orders").insert({
        job_order_id: order.job_order_id,
        stage: nextStage.value,
        status: "not_started",
      });
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/jobs/${order.job_order_id}`}
          className="text-sm font-semibold text-brand-700 hover:underline"
        >
          {order.job_orders?.job_number}
        </Link>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[order.status]}`}>
          {order.status.replace("_", " ")}
        </span>
      </div>

      <p className="mt-1 text-xs text-gray-500">{order.job_orders?.customers?.name}</p>

      {order.staff?.full_name && (
        <p className="mt-1 text-xs text-gray-400">Operator: {order.staff.full_name}</p>
      )}
      {order.machine_name && (
        <p className="text-xs text-gray-400">Machine: {order.machine_name}</p>
      )}

      <div className="mt-3 flex gap-2">
        {order.status === "not_started" && (
          <button
            onClick={startWork}
            disabled={loading}
            className="flex-1 rounded-lg bg-blue-50 px-2 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
          >
            Start
          </button>
        )}
        {order.status === "in_progress" && (
          <button
            onClick={moveToNextStage}
            disabled={loading}
            className="flex-1 rounded-lg bg-green-50 px-2 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:opacity-60"
          >
            {nextStage ? `→ ${nextStage.label}` : "✓ Finish"}
          </button>
        )}
      </div>
    </div>
  );
}
