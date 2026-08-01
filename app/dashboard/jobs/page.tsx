import { createClient } from "@/lib/supabase/server";
import JobsTable from "./jobs-table";

export default async function JobOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; priority?: string };
}) {
  const supabase = createClient();

  let query = supabase
    .from("job_orders")
    .select("id, job_number, status, priority, due_date, created_at, customers(name), quotations(quote_number, total)")
    .order("created_at", { ascending: false });

  if (searchParams.status) {
    query = query.eq("status", searchParams.status);
  }
  if (searchParams.priority) {
    query = query.eq("priority", searchParams.priority);
  }

  const { data: jobs } = await query;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-brand-900">Job Orders</h1>
      <p className="mt-1 text-sm text-gray-500">
        Created automatically once a quotation is approved.
      </p>

      <div className="mt-6">
        <JobsTable
          jobs={jobs ?? []}
          activeStatus={searchParams.status ?? ""}
          activePriority={searchParams.priority ?? ""}
        />
      </div>
    </div>
  );
}
