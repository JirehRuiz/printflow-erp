"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-left text-sm font-medium text-gray-500 transition hover:bg-gray-50 hover:text-red-600"
    >
      Sign out
    </button>
  );
}
