"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { BarChart3, ExternalLink, LockKeyhole, RefreshCw, Save, Trash2 } from "lucide-react";

import { getApplications } from "@/lib/applications";
import {
  closeJob,
  deleteJob,
  getJob,
  getRankedCandidates,
  publishJob,
  unpublishJob,
  updateJob,
} from "@/lib/jobs";
import type {
  Application,
  EmploymentType,
  Job,
  JobPayload,
  RankedCandidate,
  RemotePolicy,
} from "@/types/jobs";

type EditableJobPayload = JobPayload & { status: Job["status"] };

function toForm(job: Job): EditableJobPayload {
  return {
    title: job.title,
    description: job.description,
    requirements: job.requirements,
    location: job.location,
    department: job.department,
    employment_type: job.employment_type,
    remote_policy: job.remote_policy,
    salary_range: job.salary_range,
    status: job.status,
  };
}

const statusLabels: Record<Job["status"], string> = {
  draft: "Draft",
  published: "Published",
  closed: "Closed",
  archived: "Archived",
};

const statusClasses: Record<Job["status"], string> = {
  draft: "bg-warning-600/10 text-warning-600",
  published: "bg-success-600/10 text-success-600",
  closed: "bg-neutral-200 text-neutral-700",
  archived: "bg-neutral-100 text-neutral-500",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function scoreToneFromPercent(value: number) {
  if (value >= 85) return "bg-success-600/10 text-success-600";
  if (value >= 70) return "bg-primary-50 text-primary-700";
  if (value >= 50) return "bg-warning-600/10 text-warning-600";
  return "bg-danger-600/10 text-danger-600";
}

function scoreBarFromPercent(value: number) {
  if (value >= 85) return "bg-success-600";
  if (value >= 70) return "bg-primary-600";
  if (value >= 50) return "bg-warning-600";
  return "bg-danger-600";
}

function BreakdownBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-neutral-500">{label}</span>
        <span className="font-semibold text-neutral-800">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
        <div className={`h-full rounded-full ${scoreBarFromPercent(value)}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [form, setForm] = useState<EditableJobPayload | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [rankedCandidates, setRankedCandidates] = useState<RankedCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRanking, setIsRanking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rankingError, setRankingError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function fetchJob() {
      try {
        const [jobResponse, applicationResponse, rankingResponse] = await Promise.all([
          getJob(params.id),
          getApplications(params.id),
          getRankedCandidates(params.id).catch(() => null),
        ]);
        if (!ignore) {
          setJob(jobResponse);
          setForm(toForm(jobResponse));
          setApplications(applicationResponse);
          if (rankingResponse) {
            setRankedCandidates(rankingResponse.results);
          } else {
            setRankingError("Could not load ranked candidates.");
          }
        }
      } catch {
        if (!ignore) {
          setError("Could not load job.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    fetchJob();

    return () => {
      ignore = true;
    };
  }, [params.id]);

  async function handleRefreshRankings() {
    setIsRanking(true);
    setRankingError(null);
    try {
      const rankingResponse = await getRankedCandidates(params.id, { force: true });
      const applicationResponse = await getApplications(params.id);
      setRankedCandidates(rankingResponse.results);
      setApplications(applicationResponse);
    } catch {
      setRankingError("Could not calculate ranked candidates.");
    } finally {
      setIsRanking(false);
    }
  }

  function updateField<K extends keyof EditableJobPayload>(field: K, value: EditableJobPayload[K]) {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!job || !form) return;

    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateJob(job.id, form);
      setJob(updated);
      setForm(toForm(updated));
    } catch {
      setError("Could not save job.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePublishToggle() {
    if (!job) return;
    const updated = job.status === "published" ? await unpublishJob(job.id) : await publishJob(job.id);
    setJob(updated);
    setForm(toForm(updated));
  }

  async function handleClose() {
    if (!job) return;
    const updated = await closeJob(job.id);
    setJob(updated);
    setForm(toForm(updated));
  }

  async function handleDelete() {
    if (!job) return;
    const confirmed = window.confirm(`Delete "${job.title}"? This removes it from the jobs list.`);
    if (!confirmed) return;

    await deleteJob(job.id);
    router.push("/dashboard/jobs");
  }

  if (isLoading) {
    return <div className="text-sm text-neutral-500">Loading job...</div>;
  }

  if (error || !job || !form) {
    return (
      <div className="rounded-md border border-danger-600/20 bg-danger-600/10 px-4 py-3 text-sm text-danger-600">
        {error || "Job not found."}
      </div>
    );
  }

  const isEditable = job.status !== "archived";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">{job.title}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-neutral-600">
            {job.location}
            {job.department ? ` · ${job.department}` : ""}
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClasses[job.status]}`}
            >
              {statusLabels[job.status]}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Publish / Unpublish */}
          {(job.status === "draft" || job.status === "published" || job.status === "closed") && (
            <button
              type="button"
              onClick={handlePublishToggle}
              className="inline-flex h-10 items-center rounded-md border border-neutral-200 px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              {job.status === "published"
                ? "Unpublish"
                : job.status === "closed"
                  ? "Republish"
                  : "Publish"}
            </button>
          )}
          {/* Close */}
          {job.status === "published" && (
            <button
              type="button"
              onClick={handleClose}
              title="Close — stop accepting new applications"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-neutral-200 px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              <LockKeyhole className="h-4 w-4" aria-hidden="true" />
              Close
            </button>
          )}
          {/* View public page */}
          {job.status === "published" && (
            <Link
              href={`/jobs/${job.slug}`}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-neutral-200 px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Public page
            </Link>
          )}
          {/* Delete */}
          {job.status !== "archived" && (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-danger-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Ranked candidates section */}
      <section id="ranked-candidates" className="scroll-mt-6 rounded-md border border-primary-600/20 bg-white shadow-panel">
        <div className="flex flex-col gap-3 border-b border-neutral-200 bg-primary-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Ranked candidates</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Overall score with semantic, skill, and experience breakdown.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefreshRankings}
            disabled={isRanking}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary-600 px-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {isRanking ? <RefreshCw className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
            {isRanking ? "Calculating..." : "Refresh ranking"}
          </button>
        </div>

        {rankingError ? (
          <p className="px-4 py-4 text-sm text-danger-600">{rankingError}</p>
        ) : rankedCandidates.length === 0 ? (
          <p className="px-4 py-6 text-sm text-neutral-500">
            No ranked candidates yet. Add applications with parsed resumes, then refresh ranking.
          </p>
        ) : (
          <div className="divide-y divide-neutral-200">
            {rankedCandidates.map((candidate) => (
              <div key={candidate.application_id} className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,1fr)_minmax(180px,0.8fr)] lg:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-700">
                      {candidate.rank}
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/applications/${candidate.application_id}`}
                        className="truncate font-medium text-neutral-900 hover:text-primary-600"
                      >
                        {candidate.candidate.name}
                      </Link>
                      <p className="truncate text-sm text-neutral-500">{candidate.candidate.email}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <BreakdownBar label="Semantic" value={candidate.breakdown.semantic_match} />
                  <BreakdownBar label="Skills" value={candidate.breakdown.skill_match} />
                  <BreakdownBar label="Experience" value={candidate.breakdown.experience_match} />
                </div>

                <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
                  <span className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${scoreToneFromPercent(candidate.score)}`}>
                    {candidate.score} overall
                  </span>
                  {candidate.matched_skills.length > 0 && (
                    <span className="text-xs text-neutral-500">
                      {candidate.matched_skills.length}/{candidate.job_skills.length} skills
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <form
        onSubmit={handleSave}
        className="space-y-5 rounded-md border border-neutral-200 bg-white p-6 shadow-panel"
      >
        {/* Title */}
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-neutral-700">Title</span>
          <input
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            disabled={!isEditable}
            className="mt-1 h-10 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-400"
          />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Location */}
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Location</span>
            <input
              value={form.location}
              onChange={(e) => updateField("location", e.target.value)}
              disabled={!isEditable}
              className="mt-1 h-10 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-400"
            />
          </label>

          {/* Department */}
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Department</span>
            <input
              value={form.department}
              onChange={(e) => updateField("department", e.target.value)}
              disabled={!isEditable}
              placeholder="e.g. Engineering"
              className="mt-1 h-10 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-400"
            />
          </label>

          {/* Employment type */}
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Employment type</span>
            <select
              value={form.employment_type}
              onChange={(e) => updateField("employment_type", e.target.value as EmploymentType)}
              disabled={!isEditable}
              className="mt-1 h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-400"
            >
              <option value="full_time">Full time</option>
              <option value="part_time">Part time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
          </label>

          {/* Remote policy */}
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Remote policy</span>
            <select
              value={form.remote_policy}
              onChange={(e) => updateField("remote_policy", e.target.value as RemotePolicy)}
              disabled={!isEditable}
              className="mt-1 h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-400"
            >
              <option value="onsite">On-site</option>
              <option value="hybrid">Hybrid</option>
              <option value="remote">Remote</option>
            </select>
          </label>
        </div>

        {/* Salary range */}
        <label className="block">
          <span className="text-sm font-medium text-neutral-700">Salary range</span>
          <input
            value={form.salary_range}
            onChange={(e) => updateField("salary_range", e.target.value)}
            disabled={!isEditable}
            className="mt-1 h-10 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-400"
          />
        </label>

        {/* Description */}
        <label className="block">
          <span className="text-sm font-medium text-neutral-700">Description</span>
          <textarea
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            disabled={!isEditable}
            rows={6}
            className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-400"
          />
        </label>

        {/* Requirements */}
        <label className="block">
          <span className="text-sm font-medium text-neutral-700">Requirements</span>
          <textarea
            value={form.requirements}
            onChange={(e) => updateField("requirements", e.target.value)}
            disabled={!isEditable}
            rows={5}
            className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-400"
          />
        </label>

        <div className="flex justify-between gap-3 border-t border-neutral-200 pt-5">
          <div className="text-sm text-neutral-500">Last updated {formatDate(job.updated_at)}</div>
          <button
            type="submit"
            disabled={isSaving || !isEditable}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>

      {/* Applications section */}
      <section className="rounded-md border border-neutral-200 bg-white shadow-panel">
        <div className="border-b border-neutral-200 px-4 py-3">
          <h2 className="text-base font-semibold text-neutral-900">
            Applications
            <span className="ml-2 inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700">
              {applications.length}
            </span>
          </h2>
        </div>
        <div className="divide-y divide-neutral-200">
          {applications.length === 0 ? (
            <p className="px-4 py-6 text-sm text-neutral-500">No applications yet.</p>
          ) : (
            applications.map((application) => (
              <div key={application.id} className="flex items-center justify-between px-4 py-4">
                <div>
                  <div className="font-medium text-neutral-900">
                    {application.candidate.first_name} {application.candidate.last_name}
                  </div>
                  <div className="text-sm text-neutral-500">{application.candidate.email}</div>
                </div>
                <div className="text-right text-sm text-neutral-500">
                  <div className="capitalize">{application.status.replace("_", " ")}</div>
                  <div>{formatDate(application.applied_at)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
