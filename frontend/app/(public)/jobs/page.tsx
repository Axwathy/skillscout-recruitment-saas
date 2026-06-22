"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Radar } from "lucide-react";

import { getPublicJobs } from "@/lib/jobs";
import type { PublicJob } from "@/types/jobs";

function employmentLabel(value: string) {
  return value.replace("_", " ");
}

export default function PublicJobsPage() {
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadJobs() {
      try {
        setJobs(await getPublicJobs());
      } catch {
        setError("Could not load open jobs.");
      } finally {
        setIsLoading(false);
      }
    }

    loadJobs();
  }, []);

  return (
    <main className="min-h-screen">
      <header className="border-b border-neutral-200/70 bg-white/70 backdrop-blur-glass">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EB4425] text-white shadow-[0_8px_20px_-6px_rgba(235,68,37,0.6)]">
              <Radar className="h-4 w-4" />
            </span>
            <span className="text-base font-bold tracking-tight text-neutral-900">SkillScout</span>
          </Link>
          <Link
            href="/login"
            className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Recruiter sign in
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Open jobs</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Browse published roles and apply directly without creating an account.
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-danger-600/20 bg-danger-600/10 px-4 py-3 text-sm text-danger-600">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {isLoading ? (
            <div className="rounded-md border border-neutral-200 bg-white p-6 text-sm text-neutral-500">
              Loading jobs...
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-md border border-neutral-200 bg-white p-6 text-sm text-neutral-500">
              No published jobs are available.
            </div>
          ) : (
            jobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.slug}`}
                className="glass-panel flex flex-col gap-4 rounded-lg p-5 transition-all hover:-translate-y-0.5 hover:shadow-glass sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-600">
                    <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-neutral-900">{job.title}</h2>
                    <p className="mt-1 text-sm text-neutral-500">
                      {job.organization_name} · {job.location} ·{" "}
                      {employmentLabel(job.employment_type)}
                    </p>
                    {job.salary_range && (
                      <p className="mt-1 text-sm text-neutral-500">{job.salary_range}</p>
                    )}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-neutral-400" aria-hidden="true" />
              </Link>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
