"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function QualityCheckSection({
  jobOrderId,
  latestCheck,
}: {
  jobOrderId: string;
  latestCheck: { id: string; passed: boolean | null; remarks: string | null; checked_at: string } | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submitCheck(passed: boolean) {
    setError(null);
    setLoading(passed ? "pass" : "fail");

    const { error } = await supabase.from("quality_checks").insert({
      job_order_id: jobOrderId,
      passed,
      remarks,
    });

    setLoading(null);

    if (error) {
      setError(error.message);
      return;
    }
    setRemarks("");
    router.refresh();
  }

  if (latestCheck) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-800">Quality Control</h2>
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            latestCheck.passed ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {latestCheck.passed ? "✓ Passed QC" : "✕ Failed QC"} on{" "}
          {new Date(latestCheck.checked_at).toLocaleDateString()}
          {latestCheck.remarks && (
            <p className="mt-1 text-xs opacity-80">{latestCheck.remarks}</p>
          )}
        </div>
        {!latestCheck.passed && (
          <p className="mt-2 text-xs text-gray-400">
            Send back to production, fix the issue, then run QC again once ready.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-gray-800">Quality Control</h2>
      <textarea
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        placeholder="Remarks (optional)..."
        rows={2}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => submitCheck(true)}
          disabled={!!loading}
          className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {loading === "pass" ? "Saving..." : "✓ Pass"}
        </button>
        <button
          onClick={() => submitCheck(false)}
          disabled={!!loading}
          className="flex-1 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          {loading === "fail" ? "Saving..." : "✕ Fail"}
        </button>
      </div>
    </div>
  );
}
