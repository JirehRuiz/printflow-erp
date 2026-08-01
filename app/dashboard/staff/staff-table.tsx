"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { STAFF_ROLES } from "@/lib/constants";

type StaffMember = {
  id: string;
  full_name: string;
  role: string;
  department: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
};

const roleColors: Record<string, string> = {
  admin: "bg-brand-50 text-brand-700",
  sales: "bg-blue-50 text-blue-700",
  production: "bg-purple-50 text-purple-700",
  qc: "bg-amber-50 text-amber-700",
  accounts: "bg-green-50 text-green-700",
  delivery: "bg-gray-100 text-gray-600",
};

export default function StaffTable({
  staff,
  isAdmin,
  currentUserId,
}: {
  staff: StaffMember[];
  isAdmin: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateRole(id: string, role: string) {
    setSavingId(id);
    setError(null);
    const { error } = await supabase.from("staff").update({ role }).eq("id", id);
    setSavingId(null);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  async function toggleActive(id: string, isActive: boolean) {
    setSavingId(id);
    setError(null);
    const { error } = await supabase
      .from("staff")
      .update({ is_active: !isActive })
      .eq("id", id);
    setSavingId(null);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Status</th>
              {isAdmin && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => (
              <tr key={member.id} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-3 font-medium text-gray-800">
                  {member.full_name}
                  {member.id === currentUserId && (
                    <span className="ml-2 text-xs font-normal text-gray-400">(you)</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {isAdmin ? (
                    <select
                      value={member.role}
                      onChange={(e) => updateRole(member.id, e.target.value)}
                      disabled={savingId === member.id || member.id === currentUserId}
                      className="rounded-lg border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
                    >
                      {STAFF_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${roleColors[member.role]}`}>
                      {member.role}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{member.department ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{member.phone ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      member.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {member.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                {isAdmin && (
                  <td className="px-4 py-3 text-right">
                    {member.id !== currentUserId && (
                      <button
                        onClick={() => toggleActive(member.id, member.is_active)}
                        disabled={savingId === member.id}
                        className={`rounded-lg border px-3 py-1 text-xs font-medium disabled:opacity-50 ${
                          member.is_active
                            ? "border-red-200 text-red-600 hover:bg-red-50"
                            : "border-green-200 text-green-600 hover:bg-green-50"
                        }`}
                      >
                        {member.is_active ? "Deactivate" : "Reactivate"}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
