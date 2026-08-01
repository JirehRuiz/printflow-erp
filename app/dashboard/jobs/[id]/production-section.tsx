"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PRODUCTION_STAGES } from "@/lib/constants";

const statusColors: Record<string, string> = {
  not_started: "bg-gray-100 text-gray-500",
  in_progress: "bg-blue-50 text-blue-700",
  paused: "bg-amber-50 text-amber-700",
  completed: "bg-green-50 text-green-700",
};

type Staff = { id: string; full_name: string; role: string };

export default function ProductionSection({
  jobOrderId,
  productionOrders,
  staffList,
}: {
  jobOrderId: string;
  productionOrders: any[];
  staffList: Staff[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, { operator_id: string; machine_name: string }>>({});

  function getDraft(po: any) {
    return (
      draft[po.id] ?? {
        operator_id: po.operator_id ?? "",
        machine_name: po.machine_name ?? "",
      }
    );
  }

  function setDraftField(po: any, field: "operator_id" | "machine_name", value: string) {
    setDraft((prev) => ({
      ...prev,
      [po.id]: { ...getDraft(po), ...prev[po.id], [field]: value },
    }));
  }

  async function startProduction() {
    setLoading(true);
    await supabase.from("production_orders").insert({
      job_order_id: jobOrderId,
      stage: "design",
      status: "not_started",
    });
    await supabase
      .from("job_orders")
      .update({ status: "in_production" })
      .eq("id", jobOrderId);
    setLoading(false);
    router.refresh();
  }

  async function saveAssignment(poId: string) {
    const values = draft[poId];
    if (!values) return;

    setSavingId(poId);
    await supabase
      .from("production_orders")
      .update({
        operator_id: values.operator_id || null,
        machine_name: values.machine_name || null,
      })
      .eq("id", poId);
    setSavingId(null);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">Production Timeline</h2>
        {productionOrders.length === 0 && (
          <button
            onClick={startProduction}
            disabled={loading}
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {loading ? "Starting..." : "▶ Start Production"}
          </button>
        )}
      </div>

      {productionOrders.length === 0 ? (
        <p className="text-sm text-gray-400">
          Not started yet. Click "Start Production" to move this job onto the shop floor.
        </p>
      ) : (
        <div className="space-y-3">
          {productionOrders.map((po) => {
            const label = PRODUCTION_STAGES.find((s) => s.value === po.stage)?.label ?? po.stage;
            const values = getDraft(po);
            const isDirty =
              values.operator_id !== (po.operator_id ?? "") ||
              values.machine_name !== (po.machine_name ?? "");

            return (
              <div key={po.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[po.status]}`}>
                    {po.status.replace("_", " ")}
                  </span>
                </div>

                {po.status !== "completed" && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <select
                      value={values.operator_id}
                      onChange={(e) => setDraftField(po, "operator_id", e.target.value)}
                      className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                    >
                      <option value="">Assign operator...</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name} ({s.role})
                        </option>
                      ))}
                    </select>
                    <input
                      value={values.machine_name}
                      onChange={(e) => setDraftField(po, "machine_name", e.target.value)}
                      placeholder="Machine name"
                      className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                    />
                  </div>
                )}

                {isDirty && po.status !== "completed" && (
                  <button
                    onClick={() => saveAssignment(po.id)}
                    disabled={savingId === po.id}
                    className="mt-2 w-full rounded-lg bg-brand-500 px-2 py-1 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
                  >
                    {savingId === po.id ? "Saving..." : "Save Assignment"}
                  </button>
                )}

                {po.status !== "completed" && !isDirty && (values.operator_id || values.machine_name) && (
                  <p className="mt-1 text-xs text-gray-400">
                    {staffList.find((s) => s.id === values.operator_id)?.full_name}
                    {values.machine_name ? ` · ${values.machine_name}` : ""}
                  </p>
                )}
              </div>
            );
          })}
          <a
            href="/dashboard/production"
            className="inline-block pt-1 text-xs font-medium text-brand-600 hover:underline"
          >
            Manage on Production Board →
          </a>
        </div>
      )}
    </div>
  );
}
