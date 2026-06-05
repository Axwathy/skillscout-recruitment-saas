"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BriefcaseBusiness, FileText } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { getApplications } from "@/lib/applications";
import { getJobs } from "@/lib/jobs";

interface Stats {
  totalJobs: number;
  totalApplications: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function loadStats() {
      try {
        const [jobs, applications] = await Promise.all([
          getJobs(),
          getApplications(),
        ]);
        if (!ignore) {
          setStats({
            totalJobs: jobs.length,
            totalApplications: applications.length,
          });
        }
      } catch {
        // Stats are non-critical; silently fail.
      } finally {
        if (!ignore) setStatsLoading(false);
      }
    }
    loadStats();
    return () => {
      ignore = true;
    };
  }, []);

  if (!user) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            Welcome back, {user.first_name || user.email.split("@")[0]}
          </h1>
          {user.recruiter_profile && (
            <p className="mt-1 text-sm text-neutral-500">
              {user.recruiter_profile.organization?.name}
            </p>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-panel">
          <h2 className="mb-4 text-base font-semibold text-neutral-900">Quick links</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/dashboard/jobs"
              className="flex min-h-16 items-center gap-3 rounded-md border border-neutral-200 px-3 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <BriefcaseBusiness className="h-4 w-4 text-primary-500" aria-hidden="true" />
              <span>
                <span className="block">All job postings</span>
                <span className="mt-1 block text-xs font-normal text-neutral-500">
                  {statsLoading ? "Loading..." : `${stats?.totalJobs ?? 0} total`}
                </span>
              </span>
            </Link>
            <Link
              href="/dashboard/applications"
              className="flex min-h-16 items-center gap-3 rounded-md border border-neutral-200 px-3 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <FileText className="h-4 w-4 text-success-600" aria-hidden="true" />
              <span>
                <span className="block">All applications</span>
                <span className="mt-1 block text-xs font-normal text-neutral-500">
                  {statsLoading ? "Loading..." : `${stats?.totalApplications ?? 0} total`}
                </span>
              </span>
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-panel">
          <h2 className="mb-2 text-base font-semibold text-neutral-900">Resume uploads</h2>
          <p className="text-sm text-neutral-500">
            Resumes are attached to applications so recruiters can access the right file
            securely from each candidate submission.
          </p>
          <Link
            href="/dashboard/applications"
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-md border border-neutral-200 px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <FileText className="h-4 w-4 text-success-600" aria-hidden="true" />
            Open applications
          </Link>
        </div>
      </div>
    </div>
  );
}
