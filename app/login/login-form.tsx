"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CompanyLogo from "@/components/company-logo";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const wasDeactivated = searchParams.get("deactivated") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      {/* Faint registration-mark dots scattered in the background for texture */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-10 top-16 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute right-10 bottom-24 h-56 w-56 rounded-full bg-magenta-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-ink-900 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mb-5 flex justify-center">
            <CompanyLogo variant="login" />
          </div>
          <p className="text-sm text-gray-400">Sign in to your PrintFlow workspace</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {wasDeactivated && (
            <p className="rounded-lg bg-magenta-500/10 px-3 py-2 text-sm text-magenta-500">
              Your account has been deactivated. Contact your admin if this seems wrong.
            </p>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="you@yourcompany.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-magenta-500/10 px-3 py-2 text-sm text-magenta-500">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-ink-950 transition hover:bg-brand-600 hover:text-white disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
