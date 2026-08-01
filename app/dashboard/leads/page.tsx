import { createClient } from "@/lib/supabase/server";
import NewLeadForm from "./new-lead-form";

export default async function LeadsPage() {
  const supabase = createClient();

  const { data: leads } = await supabase
    .from("leads")
    .select("id, title, status, requirement_summary, created_at, customers(name, phone)")
    .order("created_at", { ascending: false });

  const statusColors: Record<string, string> = {
    new: "bg-blue-50 text-blue-700",
    contacted: "bg-amber-50 text-amber-700",
    qualified: "bg-purple-50 text-purple-700",
    converted: "bg-green-50 text-green-700",
    lost: "bg-gray-100 text-gray-500",
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-900">Leads</h1>
          <p className="mt-1 text-sm text-gray-500">
            Every enquiry starts here. Convert a qualified lead into a quotation when ready.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <NewLeadForm />
        </div>

        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {leads && leads.length > 0 ? (
                  leads.map((lead: any) => (
                    <tr key={lead.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{lead.title}</p>
                        {lead.requirement_summary && (
                          <p className="mt-0.5 text-xs text-gray-400">
                            {lead.requirement_summary}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {lead.customers?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            statusColors[lead.status] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                      No leads yet — add your first one on the left.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
