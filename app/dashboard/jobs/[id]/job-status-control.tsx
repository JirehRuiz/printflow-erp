"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const STATUSES = ["pending", "in_production", "on_hold", "completed", "cancelled"];

export default function JobStatusControl({
  jobId,
  status,
  dueDate,
}: {
  jobId: string;
  status: string;
  dueDate: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [currentStatus, setCurrentStatus] = useState(status);
  const [due, setDue] = useState(dueDate ?? "");
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    await supabase
      .from("job_orders")
      .update({ status: currentStatus, due_date: due || null })
      .eq("id", jobId);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-gray-800">Status</h2>

      <label className="mb-1 block text-xs font-medium text-gray-600">Job Status</label>
      <select
        value={currentStatus}
        onChange={(e) => setCurrentStatus(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replace("_", " ")}
          </option>
        ))}
      </select>

      <label className="mb-1 mt-3 block text-xs font-medium text-gray-600">Due Date</label>
      <input
        type="date"
        value={due}
        onChange={(e) => setDue(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />

      <button
        onClick={save}
        disabled={loading}
        className="mt-4 w-full rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
      >
        {loading ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
