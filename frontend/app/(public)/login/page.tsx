"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Radar } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const user = await login({ email, password });
      const callbackUrl = searchParams.get("callbackUrl");
      if (callbackUrl) {
        router.push(callbackUrl);
      } else {
        router.push(user?.role === "candidate" ? "/candidate/dashboard" : "/dashboard");
      }
    } catch (err: any) {
      setError(err.data?.detail || "An error occurred during login.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <Link
        href="/"
        className="absolute left-5 top-5 z-20 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white/70 px-4 py-2 text-sm font-medium text-neutral-600 backdrop-blur transition-colors hover:border-neutral-900 hover:text-neutral-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>

      {/* Soft gradient background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,#ffffff_0%,#f5f3f1_45%,#eceae7_100%)]" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#EB4425]/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-[24px] border border-white/70 bg-white/90 p-10 shadow-[0_24px_60px_-20px_rgba(26,28,28,0.18)] backdrop-blur-xl">
          {/* Circular accent logo */}
          <div className="flex flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EB4425] text-white shadow-[0_10px_24px_-6px_rgba(235,68,37,0.55)]">
              <Radar className="h-8 w-8" />
            </div>
            <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#EB4425]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#EB4425]">
              AI · Powered
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-neutral-900">SkillScout</h1>
            <p className="mt-1.5 text-sm text-neutral-500">Sign in to your account to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-9 space-y-7">
            {error && (
              <div className="animate-fade-in rounded-xl bg-[#EB4425]/8 px-4 py-3 text-sm font-medium text-[#B51D00]">
                {error}
              </div>
            )}

            {/* Underline inputs */}
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                disabled={isLoading}
                className="w-full border-0 border-b-2 border-neutral-200 bg-transparent pb-2 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-300 focus:border-[#EB4425]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                  className="w-full border-0 border-b-2 border-neutral-200 bg-transparent pb-2 pr-9 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-300 focus:border-[#EB4425]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute bottom-2 right-0 text-neutral-400 transition-colors hover:text-neutral-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-full bg-[#EB4425] py-3.5 text-sm font-bold text-white shadow-[0_12px_28px_-8px_rgba(235,68,37,0.5)] transition-all hover:bg-[#D93719] active:scale-[0.99] disabled:opacity-60"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-neutral-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-[#EB4425] hover:text-[#B51D00]">
              Request access
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
