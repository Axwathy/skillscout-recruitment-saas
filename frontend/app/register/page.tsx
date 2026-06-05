"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { register, candidateRegister } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<"candidate" | "recruiter">("candidate");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    companyName: "",
    website: "",
    linkedinProfile: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    if (role === "recruiter") {
      if (!formData.website && !formData.linkedinProfile) {
        setError("You must provide either an official company domain or a LinkedIn profile.");
        setIsLoading(false);
        return;
      }
    }

    try {
      if (role === "candidate") {
        await candidateRegister({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          password: formData.password,
          confirm_password: formData.confirmPassword,
        });
        router.push("/candidate/dashboard");
      } else {
        await register({
          first_name: formData.firstName,
          last_name: formData.lastName,
          company_name: formData.companyName,
          website: formData.website,
          linkedin_profile: formData.linkedinProfile,
          email: formData.email,
          password: formData.password,
          confirm_password: formData.confirmPassword,
        });
        router.push("/dashboard");
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.data) {
        const messages = Object.values(err.data).flat();
        setError(messages.join(" ") || "Registration failed.");
      } else {
        setError("An error occurred during registration.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

      <div className="w-full max-w-lg relative z-10">
        <div className="rounded-2xl border border-neutral-200 bg-white/80 backdrop-blur-xl p-8 shadow-xl shadow-neutral-200/50">
          <div className="mb-8 text-center">
            <Link
              href="/"
              className="text-sm font-bold tracking-tight text-neutral-900 hover:text-primary-600 transition-colors"
            >
              RecruitAI
            </Link>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-neutral-900">
              Create your account
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              Get started with RecruitAI today.
            </p>
          </div>

          <div className="flex rounded-lg border border-neutral-200 p-1 mb-8 bg-neutral-50/50 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => { setRole("candidate"); setError(null); }}
              className={`flex-1 rounded-md py-2 text-sm font-semibold transition-all duration-200 ${
                role === "candidate" ? "bg-white text-primary-600 shadow-sm ring-1 ring-neutral-200/50" : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              Candidate
            </button>
            <button
              type="button"
              onClick={() => { setRole("recruiter"); setError(null); }}
              className={`flex-1 rounded-md py-2 text-sm font-semibold transition-all duration-200 ${
                role === "recruiter" ? "bg-white text-primary-600 shadow-sm ring-1 ring-neutral-200/50" : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              Recruiter
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700 animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-neutral-700">
                  First name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className="mt-1.5 block w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all duration-200 disabled:opacity-50"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-neutral-700">
                  Last name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className="mt-1.5 block w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all duration-200 disabled:opacity-50"
                  disabled={isLoading}
                />
              </div>
            </div>

            {role === "recruiter" && (
              <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-neutral-700">
                    Organization name
                  </label>
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="Acme Corp"
                    className="mt-1.5 block w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all duration-200 disabled:opacity-50"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-neutral-700">
                    Company domain <span className="text-neutral-400 font-normal">(required if no LinkedIn)</span>
                  </label>
                  <input
                    id="website"
                    name="website"
                    type="url"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://acme.com"
                    className="mt-1.5 block w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all duration-200 disabled:opacity-50"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label htmlFor="linkedinProfile" className="block text-sm font-medium text-neutral-700">
                    LinkedIn profile <span className="text-neutral-400 font-normal">(required if no domain)</span>
                  </label>
                  <input
                    id="linkedinProfile"
                    name="linkedinProfile"
                    type="url"
                    value={formData.linkedinProfile}
                    onChange={handleChange}
                    placeholder="https://linkedin.com/in/you"
                    className="mt-1.5 block w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all duration-200 disabled:opacity-50"
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="email"
                className="mt-1.5 block w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all duration-200 disabled:opacity-50"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="mt-1.5 block w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all duration-200 disabled:opacity-50"
                disabled={isLoading}
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-neutral-700"
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="mt-1.5 block w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all duration-200 disabled:opacity-50"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-6 w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-primary-500 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:hover:scale-100"
            >
              {isLoading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-neutral-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-primary-600 hover:text-primary-500 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
