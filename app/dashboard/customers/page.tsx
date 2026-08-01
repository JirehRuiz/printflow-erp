import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const supabase = createClient();
  const q = searchParams.q?.trim();

  let query = supabase
    .from("customers")
    .select("id, name, company_name, phone, email, source, created_at")
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(`name.ilike.%${q}%,company_name.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  const { data: customers } = await query;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-900">Customers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Everyone you've quoted or worked with, in one place.
          </p>
        </div>
        <Link
          href="/dashboard/customers/new"
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          + New Customer
        </Link>
      </div>

      <form className="mt-6" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search by name, company, or phone..."
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </form>

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Added</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {customers && customers.length > 0 ? (
              customers.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.company_name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{c.email ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-400">{c.source ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/customers/${c.id}`}
                      className="text-sm font-medium text-brand-600 hover:underline"
                    >
                      Edit →
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  {q ? `No customers matching "${q}".` : "No customers yet — add one to get started."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
