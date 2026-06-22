"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Radar } from "lucide-react";

import { register, candidateRegister } from "@/lib/auth";
import { ApiError, getApiErrorMessage } from "@/lib/api";

function UnderlineInput({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </label>
      <input
        {...props}
        className="w-full border-0 border-b-2 border-neutral-200 bg-transparent pb-2 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-300 focus:border-[#EB4425]"
      />
    </div>
  );
}

const COMMON_PASSWORDS = new Set([
  "12345678",
  "123456789",
  "password",
  "password123",
  "qwerty123",
  "letmein",
  "welcome",
]);

function getPasswordValidationMessage(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (/^\d+$/.test(password)) {
    return "Password cannot be entirely numeric.";
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return "Password is too common. Use a stronger password.";
  }

  return null;
}

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

    const passwordError = getPasswordValidationMessage(formData.password);
    if (passwordError) {
      setError(passwordError);
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
      if (err instanceof ApiError) {
        setError(getApiErrorMessage(err, "Registration failed."));
      } else {
        setError("An error occurred during registration.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
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

      <div className="relative z-10 w-full max-w-lg">
        <div className="rounded-[24px] border border-white/70 bg-white/90 p-10 shadow-[0_24px_60px_-20px_rgba(26,28,28,0.18)] backdrop-blur-xl">
          <div className="flex flex-col items-center text-center">
            <Link
              href="/"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EB4425] text-white shadow-[0_10px_24px_-6px_rgba(235,68,37,0.55)]"
            >
              <Radar className="h-8 w-8" />
            </Link>
            <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#EB4425]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#EB4425]">
              AI · Powered
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-neutral-900">
              Create your account
            </h1>
            <p className="mt-1.5 text-sm text-neutral-500">Get started with SkillScout today.</p>
          </div>

          {/* Role toggle */}
          <div className="mt-8 flex rounded-full border border-neutral-200 bg-neutral-100/60 p-1">
            <button
              type="button"
              onClick={() => {
                setRole("candidate");
                setError(null);
              }}
              className={`flex-1 rounded-full py-2 text-sm font-semibold transition-all duration-200 ${
                role === "candidate" ? "bg-white text-[#EB4425] shadow-sm" : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              Candidate
            </button>
            <button
              type="button"
              onClick={() => {
                setRole("recruiter");
                setError(null);
              }}
              className={`flex-1 rounded-full py-2 text-sm font-semibold transition-all duration-200 ${
                role === "recruiter" ? "bg-white text-[#EB4425] shadow-sm" : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              Recruiter
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {error && (
              <div className="animate-fade-in rounded-xl bg-[#EB4425]/8 px-4 py-3 text-sm font-medium text-[#B51D00]">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <UnderlineInput
                name="firstName"
                label="First name"
                type="text"
                required
                value={formData.firstName}
                onChange={handleChange}
                disabled={isLoading}
              />
              <UnderlineInput
                name="lastName"
                label="Last name"
                type="text"
                required
                value={formData.lastName}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            {role === "recruiter" && (
              <div className="animate-fade-in space-y-6">
                <UnderlineInput
                  name="companyName"
                  label="Organization name"
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="Acme Corp"
                  disabled={isLoading}
                />
                <UnderlineInput
                  name="website"
                  label="Company domain"
                  type="url"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://acme.com (or LinkedIn)"
                  disabled={isLoading}
                />
                <UnderlineInput
                  name="linkedinProfile"
                  label="LinkedIn profile"
                  type="url"
                  value={formData.linkedinProfile}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/you"
                  disabled={isLoading}
                />
              </div>
            )}

            <UnderlineInput
              name="email"
              label="Email address"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="you@company.com"
              disabled={isLoading}
            />

            <UnderlineInput
              name="password"
              label="Password"
              type="password"
              autoComplete="new-password"
              required
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
            />

            <UnderlineInput
              name="confirmPassword"
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={isLoading}
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-full bg-[#EB4425] py-3.5 text-sm font-bold text-white shadow-[0_12px_28px_-8px_rgba(235,68,37,0.5)] transition-all hover:bg-[#D93719] active:scale-[0.99] disabled:opacity-60"
            >
              {isLoading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-neutral-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[#EB4425] hover:text-[#B51D00]">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
