"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCcw } from "lucide-react";

import { getApplications } from "@/lib/applications";
import type { Application, ApplicationStatus } from "@/types/jobs";

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: "Applied",
  under_review: "Under Review",
  shortlisted: "Shortlisted",
  technical_round: "Technical Round",
  hr_round: "HR Round",
  offer: "Offer",
  rejected: "Rejected",
  hired: "Hired 🎉",
};

const STATUS_COLOR: Record<ApplicationStatus, string> = {
  applied: "bg-primary-50 text-primary-600",
  under_review: "bg-warning-600/10 text-warning-600",
  shortlisted: "bg-sky-100 text-sky-700",
  technical_round: "bg-purple-100 text-purple-700",
  hr_round: "bg-indigo-100 text-indigo-700",
  offer: "bg-success-600/10 text-success-600",
  rejected: "bg-danger-600/10 text-danger-600",
  hired: "bg-emerald-100 text-emerald-700",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadApplications() {
    setIsLoading(true);
    setError(null);
    try {
      setApplications(await getApplications());
    } catch {
      setError("Could not load applications.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function fetchInitialApplications() {
      try {
        const response = await getApplications();
        if (!ignore) {
          setApplications(response);
        }
      } catch {
        if (!ignore) {
          setError("Could not load applications.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    fetchInitialApplications();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Applications</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Review candidate submissions across published jobs.
          </p>
        </div>
        <button
          type="button"
          onClick={loadApplications}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-danger-600/20 bg-danger-600/10 px-4 py-3 text-sm text-danger-600">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-md border border-neutral-200 bg-white shadow-panel">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-neutral-500">
                Candidate
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-neutral-500">
                Job
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-neutral-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-neutral-500">
                Applied
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-neutral-500">
                  Loading applications...
                </td>
              </tr>
            ) : applications.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-neutral-500">
                  No applications found.
                </td>
              </tr>
            ) : (
              applications.map((application) => (
                <tr key={application.id}>
                  <td className="px-4 py-4">
                    <Link
                      href={`/dashboard/candidates/${application.candidate.id}`}
                      className="font-medium text-primary-600 hover:text-primary-700"
                    >
                      {application.candidate.first_name} {application.candidate.last_name}
                    </Link>
                    <div className="text-sm text-neutral-500">{application.candidate.email}</div>
                  </td>
                  <td className="px-4 py-4 text-sm text-neutral-700">
                    <Link
                      href={`/dashboard/jobs/${application.job_id}`}
                      className="font-medium text-primary-600 hover:text-primary-700"
                    >
                      {application.job_title}
                    </Link>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLOR[application.status]}`}
                    >
                      {STATUS_LABEL[application.status]}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-neutral-700">
                    {formatDate(application.applied_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
