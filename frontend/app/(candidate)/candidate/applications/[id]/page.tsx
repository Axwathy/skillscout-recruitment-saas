"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, FileText, XCircle } from "lucide-react";

import { getCandidateApplication } from "@/lib/candidate";
import type { CandidateApplication } from "@/types/candidate";
import type { ApplicationStatus } from "@/types/jobs";

// ─── Pipeline definition ─────────────────────────────────────────────────────

const PIPELINE_STAGES: { status: ApplicationStatus; label: string }[] = [
  { status: "applied", label: "Applied" },
  { status: "under_review", label: "Under Review" },
  { status: "shortlisted", label: "Shortlisted" },
  { status: "technical_round", label: "Technical Round" },
  { status: "hr_round", label: "HR Round" },
  { status: "offer", label: "Offer" },
  { status: "hired", label: "Hired" },
];

const STAGE_ORDER = PIPELINE_STAGES.map((s) => s.status);

function getStageIndex(status: ApplicationStatus): number {
  return STAGE_ORDER.indexOf(status);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(v: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(v));
}

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: "Applied",
  under_review: "Under Review",
  shortlisted: "Shortlisted",
  technical_round: "Technical Round",
  hr_round: "HR Round",
  offer: "Offer Extended",
  rejected: "Application Closed",
  hired: "Hired 🎉",
};

const STATUS_COLOR: Record<ApplicationStatus, string> = {
  applied: "bg-primary-50 text-primary-600 border-primary-200",
  under_review: "bg-warning-600/10 text-warning-600 border-warning-600/20",
  shortlisted: "bg-sky-50 text-sky-700 border-sky-200",
  technical_round: "bg-purple-50 text-purple-700 border-purple-200",
  hr_round: "bg-indigo-50 text-indigo-700 border-indigo-200",
  offer: "bg-success-600/10 text-success-600 border-success-600/20",
  rejected: "bg-danger-600/10 text-danger-600 border-danger-600/20",
  hired: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressTracker({ status }: { status: ApplicationStatus }) {
  const isRejected = status === "rejected";
  const currentIndex = getStageIndex(status);

  if (isRejected) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-danger-600/20 bg-danger-600/5 p-5">
        <XCircle className="h-6 w-6 shrink-0 text-danger-600" aria-hidden="true" />
        <div>
          <p className="font-semibold text-danger-600">Application not progressed</p>
          <p className="text-sm text-neutral-500">
            The recruiter has closed this application. Keep applying!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-panel overflow-x-auto">
      <h3 className="mb-5 text-sm font-semibold text-neutral-700 uppercase tracking-wide">
        Application Progress
      </h3>
      <div className="flex min-w-max items-center gap-0">
        {PIPELINE_STAGES.map((stage, idx) => {
          const done = idx < currentIndex;
          const active = idx === currentIndex;
          return (
            <div key={stage.status} className="flex items-center">
              {/* Node */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                    done
                      ? "border-primary-500 bg-primary-500 text-white"
                      : active
                        ? "border-primary-500 bg-white text-primary-600"
                        : "border-neutral-200 bg-neutral-50 text-neutral-300"
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Circle className="h-4 w-4" aria-hidden="true" />
                  )}
                </div>
                <span
                  className={`text-xs font-medium whitespace-nowrap ${
                    active ? "text-primary-600" : done ? "text-neutral-700" : "text-neutral-400"
                  }`}
                >
                  {stage.label}
                </span>
              </div>
              {/* Connector line */}
              {idx < PIPELINE_STAGES.length - 1 && (
                <div
                  className={`mx-1 mb-4 h-0.5 w-12 transition-colors ${
                    done ? "bg-primary-500" : "bg-neutral-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CandidateApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const [app, setApp] = useState<CandidateApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    getCandidateApplication(params.id)
      .then((data) => { if (!ignore) setApp(data); })
      .catch(() => { if (!ignore) setError("Application not found."); })
      .finally(() => { if (!ignore) setIsLoading(false); });
    return () => { ignore = true; };
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="py-20 text-center text-sm text-neutral-400">Loading application…</div>
    );
  }

  if (error || !app) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-danger-600">{error ?? "Something went wrong."}</p>
        <Link
          href="/candidate/applications"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to applications
        </Link>
      </div>
    );
  }

  const badge = STATUS_COLOR[app.status];
  const label = STATUS_LABEL[app.status];

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/candidate/applications"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        My Applications
      </Link>

      {/* Header card */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-lg font-bold text-primary-600">
              {app.organization_name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900">{app.job_title}</h1>
              <p className="text-sm text-neutral-500">{app.organization_name}</p>
              <p className="mt-1 text-xs text-neutral-400">
                Applied {new Intl.DateTimeFormat("en", {
                  month: "long", day: "numeric", year: "numeric",
                }).format(new Date(app.applied_at))}
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${badge}`}
          >
            {label}
          </span>
        </div>
      </div>

      {/* Progress tracker */}
      <ProgressTracker status={app.status} />

      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-neutral-900">Resume</h2>
        {app.resumes && app.resumes.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {app.resumes.map((resume) => (
              <li
                key={resume.id}
                className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3"
              >
                <FileText className="h-4 w-4 text-neutral-500" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {resume.file_name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {(resume.file_size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-neutral-500">No resume uploaded yet.</p>
        )}
      </section>

      {/* Timeline */}
      {app.history && app.history.length > 0 && (
        <section className="rounded-xl border border-neutral-200 bg-white shadow-panel overflow-hidden">
          <div className="border-b border-neutral-100 px-5 py-4">
            <h2 className="text-base font-semibold text-neutral-900">Activity Timeline</h2>
          </div>
          <ul className="divide-y divide-neutral-50 px-5">
            {[...app.history].reverse().map((entry, idx) => (
              <li key={entry.id} className="flex gap-4 py-4">
                {/* Dot */}
                <div className="mt-0.5 flex flex-col items-center">
                  <div className="h-2.5 w-2.5 rounded-full bg-primary-500 ring-4 ring-primary-50" />
                  {idx < app.history!.length - 1 && (
                    <div className="mt-1 flex-1 border-l border-dashed border-neutral-200" />
                  )}
                </div>
                {/* Content */}
                <div className="flex-1 pb-1">
                  <p className="text-sm font-medium text-neutral-900">
                    {entry.from_status
                      ? `Moved from ${STATUS_LABEL[entry.from_status as ApplicationStatus] ?? entry.from_status} to ${STATUS_LABEL[entry.to_status as ApplicationStatus] ?? entry.to_status}`
                      : `Application received — ${STATUS_LABEL[entry.to_status as ApplicationStatus] ?? entry.to_status}`}
                  </p>
                  {entry.notes && (
                    <p className="mt-0.5 text-sm text-neutral-500 italic">"{entry.notes}"</p>
                  )}
                  <p className="mt-1 text-xs text-neutral-400">{formatDate(entry.changed_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* View job link */}
      <div className="text-center">
        <Link
          href={`/jobs/${app.job_slug}`}
          className="text-sm font-medium text-primary-600 hover:underline"
        >
          View job posting →
        </Link>
      </div>
    </div>
  );
}
