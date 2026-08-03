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
  const [startStage, setStartStage] = useState("design");
  const [targetStage, setTargetStage] = useState<Record<string, string>>({});

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

  function getTargetStage(po: any) {
    if (targetStage[po.id]) return targetStage[po.id];
    const currentIndex = PRODUCTION_STAGES.findIndex((s) => s.value === po.stage);
    return PRODUCTION_STAGES[currentIndex + 1]?.value ?? PRODUCTION_STAGES[0].value;
  }

  async function startProduction() {
    setLoading(true);
    await supabase.from("production_orders").insert({
      job_order_id: jobOrderId,
      stage: startStage,
      status: "not_started",
    });
    await supabase
      .from("job_orders")
      .update({ status: "in_production" })
      .eq("id", jobOrderId);
    setLoading(false);
    router.refresh();
  }

  async function startWork(poId: string) {
    setSavingId(poId);
    await supabase
      .from("production_orders")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("id", poId);
    setSavingId(null);
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

  async function moveToStage(po: any, stage: string, markComplete: boolean) {
    setSavingId(po.id);

    await supabase
      .from("production_orders")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", po.id);

    await supabase.from("production_orders").insert({
      job_order_id: jobOrderId,
      stage,
      status: markComplete ? "completed" : "in_progress",
      started_at: new Date().toISOString(),
      completed_at: markComplete ? new Date().toISOString() : null,
    });

    setSavingId(null);
    router.refresh();
  }

  async function skipToQC(po: any) {
    setSavingId(po.id);

    await supabase
      .from("production_orders")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", po.id);

    await supabase.from("production_orders").insert({
      job_order_id: jobOrderId,
      stage: "ready",
      status: "completed",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });

    setSavingId(null);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-gray-200/70 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">Production Timeline</h2>
      </div>

      {productionOrders.length === 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-gray-400">Not started yet. Begin at:</p>
          <select
            value={startStage}
            onChange={(e) => setStartStage(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
          >
            {PRODUCTION_STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            onClick={startProduction}
            disabled={loading}
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-ink-950 hover:bg-brand-600 hover:text-white disabled:opacity-60"
          >
            {loading ? "Starting..." : "▶ Start Production"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {productionOrders.map((po) => {
            const label = PRODUCTION_STAGES.find((s) => s.value === po.stage)?.label ?? po.stage;
            const values = getDraft(po);
            const isDirty =
              values.operator_id !== (po.operator_id ?? "") ||
              values.machine_name !== (po.machine_name ?? "");
            const isAtReady = po.stage === "ready";
            const busy = savingId === po.id;

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
                    disabled={busy}
                    className="mt-2 w-full rounded-lg bg-brand-500 px-2 py-1 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
                  >
                    {busy ? "Saving..." : "Save Assignment"}
                  </button>
                )}

                {po.status !== "completed" && !isDirty && (values.operator_id || values.machine_name) && (
                  <p className="mt-1 text-xs text-gray-400">
                    {staffList.find((s) => s.id === values.operator_id)?.full_name}
                    {values.machine_name ? ` · ${values.machine_name}` : ""}
                  </p>
                )}

                {po.status === "not_started" && (
                  <button
                    onClick={() => startWork(po.id)}
                    disabled={busy}
                    className="mt-2 w-full rounded-lg bg-blue-50 px-2 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                  >
                    Start
                  </button>
                )}

                {po.status === "in_progress" && isAtReady && (
                  <button
                    onClick={() => moveToStage(po, "ready", true)}
                    disabled={busy}
                    className="mt-2 w-full rounded-lg bg-green-50 px-2 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:opacity-60"
                  >
                    ✓ Mark Complete
                  </button>
                )}

                {po.status === "in_progress" && !isAtReady && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex gap-1.5">
                      <select
                        value={getTargetStage(po)}
                        onChange={(e) =>
                          setTargetStage((prev) => ({ ...prev, [po.id]: e.target.value }))
                        }
                        className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-xs"
                      >
                        {PRODUCTION_STAGES.filter((s) => s.value !== po.stage).map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => moveToStage(po, getTargetStage(po), false)}
                        disabled={busy}
                        className="rounded-lg bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:opacity-60"
                      >
                        Move
                      </button>
                    </div>
                    <button
                      onClick={() => skipToQC(po)}
                      disabled={busy}
                      className="w-full rounded-lg border border-dashed border-gray-300 px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
                    >
                      ⏭ Skip straight to QC
                    </button>
                  </div>
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
