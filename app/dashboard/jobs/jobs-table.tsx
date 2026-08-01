"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  in_production: "bg-purple-50 text-purple-700",
  on_hold: "bg-amber-50 text-amber-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-700",
};

const STATUSES = ["pending", "in_production", "on_hold", "completed", "cancelled"];
const PRIORITIES = ["low", "normal", "high", "urgent"];

export default function JobsTable({
  jobs,
  activeStatus,
  activePriority,
}: {
  jobs: any[];
  activeStatus: string;
  activePriority: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  function updateFilter(key: "status" | "priority", value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/dashboard/jobs?${params.toString()}`);
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return jobs;
    return jobs.filter((job) => {
      const haystack = [
        job.job_number,
        job.customers?.name,
        job.quotations?.quote_number,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [jobs, search]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search job #, customer, quote #..."
          className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <select
          value={activeStatus}
          onChange={(e) => updateFilter("status", e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
        <select
          value={activePriority}
          onChange={(e) => updateFilter("priority", e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {(activeStatus || activePriority || search) && (
          <button
            onClick={() => {
              setSearch("");
              router.push("/dashboard/jobs");
            }}
            className="text-xs font-medium text-gray-400 hover:text-gray-600"
          >
            Clear filters
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">
          {filtered.length} of {jobs.length} jobs
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Job #</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Quotation</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Due Date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((job: any) => (
                <tr key={job.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{job.job_number}</td>
                  <td className="px-4 py-3 text-gray-600">{job.customers?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{job.quotations?.quote_number ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[job.status]}`}>
                      {job.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{job.priority}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {job.due_date ? new Date(job.due_date).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/jobs/${job.id}`}
                      className="text-sm font-medium text-brand-600 hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  {jobs.length === 0
                    ? "No job orders yet — approve a quotation to create one."
                    : "No jobs match your filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
