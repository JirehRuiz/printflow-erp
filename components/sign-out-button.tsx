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
      className="w-full rounded-lg border border-white/10 px-3 py-1.5 text-left text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-magenta-500"
    >
      Sign out
    </button>
  );
}
