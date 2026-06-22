"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Download,
  ExternalLink,
  FileText,
  Github,
  Linkedin,
  Mail,
  Phone,
  RefreshCw,
  UserRound,
} from "lucide-react";

import { InterviewPrepPanel } from "@/components/InterviewPrepPanel";
import { ParsedResumePanel } from "@/components/ParsedResumePanel";
import { isUnauthorizedError } from "@/lib/api";
import { getApplication, getResumeFile, reparseResume } from "@/lib/applications";
import { updateApplicationStatus } from "@/lib/candidate";
import { getRankedCandidates } from "@/lib/jobs";
import { formatScore, scoreBarColor, scorePercent, scoreTone } from "@/lib/scores";
import type { Resume } from "@/types/candidate";
import type { Application, ApplicationStatus } from "@/types/jobs";

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "applied", label: "Applied" },
  { value: "under_review", label: "Under Review" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "technical_round", label: "Technical Round" },
  { value: "hr_round", label: "HR Round" },
  { value: "offer", label: "Offer" },
  { value: "hired", label: "Hired" },
  { value: "rejected", label: "Rejected" },
];

const RESUME_STATUS_CLASSES: Record<string, string> = {
  pending: "bg-neutral-100 text-neutral-600",
  processing: "bg-warning-600/10 text-warning-600",
  completed: "bg-success-600/10 text-success-600",
  error: "bg-danger-600/10 text-danger-600",
};

function formatDate(v: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(v));
}

function ScoreRow({ label, value }: { label: string; value: Application["final_score"] }) {
  const percent = scorePercent(value);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-neutral-600">{label}</span>
        <span className="font-semibold text-neutral-900">{formatScore(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
        <div
          className={`h-full rounded-full ${scoreBarColor(value)}`}
          style={{ width: `${percent ?? 0}%` }}
        />
      </div>
    </div>
  );
}

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [app, setApp] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status update state
  const [isUpdating, setIsUpdating] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [reparsingResumeId, setReparsingResumeId] = useState<string | null>(null);
  const [activeResumeAction, setActiveResumeAction] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<ApplicationStatus>("applied");
  const [updateNotes, setUpdateNotes] = useState("");
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  useEffect(() => {
    let ignore = false;
    getApplication(params.id)
      .then((data) => {
        if (!ignore) {
          setApp(data);
          setNewStatus(data.status);
        }
      })
      .catch(() => { if (!ignore) setError("Application not found."); })
      .finally(() => { if (!ignore) setIsLoading(false); });
    return () => { ignore = true; };
  }, [params.id]);

  async function handleStatusUpdate(e: FormEvent) {
    e.preventDefault();
    if (!app) return;
    setIsUpdating(true);
    try {
      const updated = await updateApplicationStatus(app.id, newStatus, updateNotes);
      setApp(updated);
      setUpdateNotes("");
      setShowUpdateForm(false);
    } catch (err) {
      if (isUnauthorizedError(err)) return;
      alert("Failed to update status.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleReparse(resumeId: string) {
    setReparsingResumeId(resumeId);
    try {
      await reparseResume(resumeId);
      const refreshed = await getApplication(params.id);
      setApp(refreshed);
    } catch (err) {
      if (isUnauthorizedError(err)) return;
      alert("Failed to queue resume parsing.");
    } finally {
      setReparsingResumeId(null);
    }
  }

  async function handleRefreshScores() {
    if (!app) return;
    setIsScoring(true);
    try {
      await getRankedCandidates(app.job_id, { force: true });
      const refreshed = await getApplication(app.id);
      setApp(refreshed);
    } catch (err) {
      if (isUnauthorizedError(err)) return;
      alert("Failed to calculate scores.");
    } finally {
      setIsScoring(false);
    }
  }

  async function handleResumeFile(resume: Resume, mode: "view" | "download") {
    const url = mode === "view" ? resume.view_url : resume.download_url;
    if (!url) return;

    const actionKey = `${resume.id}:${mode}`;
    const previewWindow = mode === "view" ? window.open("about:blank", "_blank") : null;
    if (previewWindow) {
      previewWindow.opener = null;
    }
    setActiveResumeAction(actionKey);

    try {
      const blob = await getResumeFile(url);
      const objectUrl = URL.createObjectURL(blob);

      if (mode === "view") {
        if (previewWindow) {
          previewWindow.location.href = objectUrl;
        } else {
          window.open(objectUrl, "_blank", "noopener,noreferrer");
        }
      } else {
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = resume.file_name;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      }

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (err) {
      previewWindow?.close();
      if (isUnauthorizedError(err)) return;
      alert(`Failed to ${mode} resume.`);
    } finally {
      setActiveResumeAction(null);
    }
  }

  if (isLoading) {
    return <div className="py-20 text-center text-sm text-neutral-400">Loading…</div>;
  }

  if (error || !app) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-danger-600">{error ?? "Failed to load."}</p>
        <Link href="/dashboard/applications" className="mt-4 text-sm font-medium text-primary-600 hover:underline">
          Back to applications
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <Link
        href="/dashboard/pipeline"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Pipeline
      </Link>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column (Main details) */}
        <div className="space-y-6 md:col-span-2">
          {/* Header */}
          <div className="glass-panel rounded-lg p-6 shadow-panel">
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
              {app.candidate.first_name} {app.candidate.last_name}
            </h1>
            <p className="text-sm text-neutral-500">
              Applied {formatDate(app.applied_at)} for{" "}
              <Link href={`/dashboard/jobs/${app.job_id}`} className="font-medium text-primary-600 hover:underline">
                {app.job_title}
              </Link>
            </p>

            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                href={`/dashboard/candidates/${app.candidate.id}`}
                className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                <UserRound className="h-4 w-4" />
                Candidate profile
              </Link>
              <a
                href={`mailto:${app.candidate.email}`}
                className="flex items-center gap-2 text-sm text-neutral-600 hover:text-primary-600"
              >
                <Mail className="h-4 w-4" />
                {app.candidate.email}
              </a>
              {app.candidate.phone && (
                <a
                  href={`tel:${app.candidate.phone}`}
                  className="flex items-center gap-2 text-sm text-neutral-600 hover:text-primary-600"
                >
                  <Phone className="h-4 w-4" />
                  {app.candidate.phone}
                </a>
              )}
              {app.candidate.linkedin_url && (
                <a
                  href={app.candidate.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-neutral-600 hover:text-primary-600"
                >
                  <Linkedin className="h-4 w-4" />
                  LinkedIn
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {app.candidate.github_url && (
                <a
                  href={app.candidate.github_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-neutral-600 hover:text-primary-600"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          {/* Application History */}
          <div className="glass-panel rounded-lg shadow-panel">
            <div className="border-b border-neutral-100 px-6 py-4">
              <h2 className="text-base font-semibold text-neutral-900">Status History</h2>
            </div>
            <div className="p-6">
              {!app.history || app.history.length === 0 ? (
                <p className="text-sm text-neutral-500">No history available.</p>
              ) : (
                <ul className="space-y-6 relative before:absolute before:inset-y-0 before:left-3.5 before:w-px before:bg-neutral-200">
                  {[...app.history].reverse().map((entry) => (
                    <li key={entry.id} className="relative flex gap-5 pl-10">
                      <div className="absolute left-1.5 top-1.5 h-4 w-4 rounded-full border-4 border-white bg-primary-400" />
                      <div>
                        <p className="text-sm font-medium text-neutral-900">
                          {entry.from_status
                            ? `Moved to ${STATUS_OPTIONS.find((o) => o.value === entry.to_status)?.label ?? entry.to_status}`
                            : `Application Received`}
                        </p>
                        {entry.notes && (
                          <p className="mt-1 text-sm text-neutral-600 bg-neutral-50 rounded-md p-2">
                            "{entry.notes}"
                          </p>
                        )}
                        <p className="mt-1.5 text-xs text-neutral-400 flex gap-2">
                          <span>{formatDate(entry.changed_at)}</span>
                          {entry.changed_by_email && (
                            <>
                              <span>•</span>
                              <span>by {entry.changed_by_email}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <InterviewPrepPanel applicationId={app.id} />
        </div>

        {/* Right Column (Actions) */}
        <div className="space-y-6">
          <div className="glass-panel rounded-lg p-6 shadow-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-neutral-900">Match score</h2>
                <p className="mt-1 text-xs text-neutral-500">
                  Hybrid ranking: semantic, skill, and experience fit.
                </p>
              </div>
              <span
                className={`inline-flex h-10 min-w-14 items-center justify-center rounded-full px-3 text-sm font-bold ${scoreTone(app.final_score)}`}
              >
                {formatScore(app.final_score)}
              </span>
            </div>

            {app.final_score === null || app.final_score === undefined ? (
              <p className="mt-4 rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
                No score calculated yet. Refresh scores to rank this job's candidates.
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                <ScoreRow label="Overall score" value={app.final_score} />
                <ScoreRow label="Semantic match" value={app.semantic_score} />
                <ScoreRow label="Skill match" value={app.skill_score} />
                <ScoreRow label="Experience match" value={app.experience_score} />
                {app.score_calculated_at && (
                  <p className="text-xs text-neutral-400">
                    Calculated {formatDate(app.score_calculated_at)}
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleRefreshScores}
              disabled={isScoring}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-700 hover:shadow-accent disabled:opacity-60"
            >
              {isScoring ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <BarChart3 className="h-4 w-4" />
              )}
              {isScoring ? "Calculating..." : "Refresh scores"}
            </button>
          </div>

          <div className="glass-panel rounded-lg shadow-panel p-6 space-y-4">
            <h2 className="text-base font-semibold text-neutral-900">Resume</h2>
            {app.resumes && app.resumes.length > 0 ? (
              <ul className="space-y-3">
                {app.resumes.map((resume) => (
                  <li
                    key={resume.id}
                    className="rounded-lg border border-neutral-200 bg-neutral-50 p-3"
                  >
                    <div className="flex items-start gap-3">
                      <FileText className="mt-0.5 h-4 w-4 text-neutral-500" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium text-neutral-900">
                            {resume.file_name}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${RESUME_STATUS_CLASSES[resume.status]}`}
                          >
                            {resume.status}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500">
                          {(resume.file_size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    {(resume.view_url || resume.download_url) && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleResumeFile(resume, "view")}
                          disabled={!resume.view_url || activeResumeAction === `${resume.id}:view`}
                          className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 ring-1 ring-inset ring-neutral-200 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <ExternalLink className="h-4 w-4" />
                          {activeResumeAction === `${resume.id}:view` ? "Opening..." : "View"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResumeFile(resume, "download")}
                          disabled={!resume.download_url || activeResumeAction === `${resume.id}:download`}
                          className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 ring-1 ring-inset ring-neutral-200 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Download className="h-4 w-4" />
                          {activeResumeAction === `${resume.id}:download` ? "Downloading..." : "Download"}
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleReparse(resume.id)}
                      disabled={reparsingResumeId === resume.id}
                      className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-200 disabled:opacity-60"
                    >
                      {reparsingResumeId === resume.id && (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      )}
                      Re-parse
                    </button>
                    <div className="mt-3">
                      <ParsedResumePanel parsedResume={resume.parsed_resume} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-500">No resume uploaded yet.</p>
            )}
          </div>

          <div className="glass-panel rounded-lg shadow-panel p-6 space-y-4">
            <h2 className="text-base font-semibold text-neutral-900">Current Status</h2>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-primary-500" />
              <span className="font-medium text-neutral-700">
                {STATUS_OPTIONS.find((o) => o.value === app.status)?.label ?? app.status}
              </span>
            </div>

            {!showUpdateForm ? (
              <button
                onClick={() => setShowUpdateForm(true)}
                className="mt-4 w-full rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200"
              >
                Change status
              </button>
            ) : (
              <form onSubmit={handleStatusUpdate} className="mt-4 space-y-3 border-t border-neutral-200 pt-4">
                <label className="block">
                  <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Move to Stage</span>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as ApplicationStatus)}
                    className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-white/70 px-4 py-2.5 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Notes (optional)</span>
                  <textarea
                    value={updateNotes}
                    onChange={(e) => setUpdateNotes(e.target.value)}
                    rows={2}
                    placeholder="E.g. Passed the technical screen"
                    className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-white/70 px-4 py-2.5 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white"
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 px-3 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-700 hover:shadow-accent disabled:opacity-50"
                  >
                    {isUpdating && <RefreshCw className="h-3 w-3 animate-spin" />}
                    Update
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUpdateForm(false)}
                    className="flex-1 rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
