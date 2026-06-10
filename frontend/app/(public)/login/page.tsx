"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="rounded-2xl border border-neutral-200 bg-white/80 backdrop-blur-xl p-8 shadow-xl shadow-neutral-200/50">
          <div className="mb-8 text-center">
            <Link
              href="/"
              className="text-sm font-bold tracking-tight text-neutral-900 hover:text-primary-600 transition-colors"
            >
              RecruitAI
            </Link>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-neutral-900">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              Enter your credentials to access your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700 animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="login-email"
                className="block text-sm font-medium text-neutral-700"
              >
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email"
                className="mt-1.5 block w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all duration-200 disabled:opacity-50"
                disabled={isLoading}
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-neutral-700"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 block w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all duration-200 disabled:opacity-50"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-6 w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-primary-500 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:hover:scale-100"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-neutral-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-primary-600 hover:text-primary-500 transition-colors"
            >
              Get started
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
