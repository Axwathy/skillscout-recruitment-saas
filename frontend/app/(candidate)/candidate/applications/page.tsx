"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BriefcaseBusiness, ChevronRight, Trash2 } from "lucide-react";

import { getCandidateApplications, withdrawCandidateApplication } from "@/lib/candidate";
import type { CandidateApplication } from "@/types/candidate";
import type { ApplicationStatus } from "@/types/jobs";

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

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "applied", label: "Applied" },
  { value: "under_review", label: "Under Review" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "technical_round", label: "Technical Round" },
  { value: "hr_round", label: "HR Round" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
  { value: "hired", label: "Hired" },
];

function formatDate(v: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(v),
  );
}

export default function CandidateApplicationsPage() {
  const [applications, setApplications] = useState<CandidateApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    let ignore = false;
    getCandidateApplications()
      .then((data) => { if (!ignore) setApplications(data); })
      .catch(() => {})
      .finally(() => { if (!ignore) setIsLoading(false); });
    return () => { ignore = true; };
  }, []);

  async function handleWithdraw(app: CandidateApplication) {
    const confirmed = window.confirm(
      `Delete your application to ${app.job_title} at ${app.organization_name}? This cannot be undone.`,
    );
    if (!confirmed) return;
    try {
      await withdrawCandidateApplication(app.id);
      setApplications((current) => current.filter((item) => item.id !== app.id));
    } catch {
      // ignore — row stays if the request fails
    }
  }

  const filtered = statusFilter
    ? applications.filter((a) => a.status === statusFilter)
    : applications;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">My Applications</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {applications.length} application{applications.length !== 1 ? "s" : ""} total
        </p>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              statusFilter === f.value
                ? "bg-primary-600 text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="glass-panel overflow-hidden rounded-lg">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-neutral-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <BriefcaseBusiness className="mx-auto mb-3 h-10 w-10 text-neutral-300" />
            <p className="text-sm text-neutral-500">
              {statusFilter ? "No applications match this filter." : "No applications yet."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200/70">
            {filtered.map((app) => (
              <li key={app.id} className="flex items-center gap-2 pr-4">
                <Link
                  href={`/candidate/applications/${app.id}`}
                  className="group flex flex-1 items-center gap-4 py-4 pl-5 transition-colors hover:bg-white/50"
                >
                  {/* Company initial */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-sm font-bold text-primary-600">
                    {app.organization_name?.[0]?.toUpperCase() ?? "?"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-neutral-900 group-hover:text-primary-600">
                      {app.job_title}
                    </p>
                    <p className="text-sm text-neutral-500">{app.organization_name}</p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[app.status]}`}
                    >
                      {STATUS_LABEL[app.status]}
                    </span>
                    <span className="text-xs text-neutral-400">{formatDate(app.applied_at)}</span>
                  </div>

                  <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300 group-hover:text-primary-400" />
                </Link>
                <button
                  type="button"
                  onClick={() => handleWithdraw(app)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-danger-600/30 text-danger-600 transition-colors hover:bg-danger-50"
                  title="Delete application"
                  aria-label={`Delete application to ${app.job_title}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
