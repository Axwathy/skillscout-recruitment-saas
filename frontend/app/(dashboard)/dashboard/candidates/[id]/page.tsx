"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  BriefcaseBusiness,
  Clock3,
  ExternalLink,
  FileText,
  Mail,
  MessageSquareText,
  Phone,
  Trash2,
} from "lucide-react";

import { ParsedResumePanel } from "@/components/ParsedResumePanel";
import { isUnauthorizedError } from "@/lib/api";
import { getResumeFile } from "@/lib/applications";
import {
  createCandidateNote,
  deleteCandidateNote,
  getRecruiterCandidateProfile,
} from "@/lib/candidate";
import { formatScore, scoreBarColor, scorePercent, scoreTone } from "@/lib/scores";
import type {
  CandidateApplication,
  CandidateNote,
  CandidateProfileActivityEntry,
  RecruiterCandidateProfile,
  Resume,
} from "@/types/candidate";
import type { ApplicationStatus, ScoreValue } from "@/types/jobs";

type ProfileTab = "overview" | "resume" | "scores" | "activity" | "notes";

const TABS: Array<{ id: ProfileTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "resume", label: "Resume" },
  { id: "scores", label: "Scores" },
  { id: "activity", label: "Activity" },
  { id: "notes", label: "Notes" },
];

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: "Applied",
  under_review: "Under Review",
  shortlisted: "Shortlisted",
  technical_round: "Technical Round",
  hr_round: "HR Round",
  offer: "Offer",
  rejected: "Rejected",
  hired: "Hired",
};

const RESUME_STATUS_CLASSES: Record<string, string> = {
  pending: "bg-neutral-100 text-neutral-600",
  processing: "bg-warning-600/10 text-warning-600",
  completed: "bg-success-600/10 text-success-600",
  error: "bg-danger-600/10 text-danger-600",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function candidateName(profile: RecruiterCandidateProfile) {
  const candidate = profile.candidate;
  return `${candidate.first_name} ${candidate.last_name}`.trim() || candidate.email;
}

function ScoreRow({ label, value }: { label: string; value: ScoreValue | undefined }) {
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

function ApplicationScoreCard({ application }: { application: CandidateApplication }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/dashboard/applications/${application.id}`}
            className="font-semibold text-primary-600 hover:text-primary-700"
          >
            {application.job_title}
          </Link>
          <p className="mt-1 text-xs text-neutral-500">
            {STATUS_LABEL[application.status]} - Applied {formatDate(application.applied_at)}
          </p>
        </div>
        <span
          className={`inline-flex h-10 min-w-14 items-center justify-center rounded-full px-3 text-sm font-bold ${scoreTone(application.final_score)}`}
        >
          {formatScore(application.final_score)}
        </span>
      </div>
      <div className="mt-5 space-y-4">
        <ScoreRow label="Overall score" value={application.final_score} />
        <ScoreRow label="Semantic match" value={application.semantic_score} />
        <ScoreRow label="Skill match" value={application.skill_score} />
        <ScoreRow label="Experience match" value={application.experience_score} />
      </div>
      {application.score_calculated_at && (
        <p className="mt-4 text-xs text-neutral-400">
          Calculated {formatDate(application.score_calculated_at)}
        </p>
      )}
    </div>
  );
}

function ActivityTimeline({ activity }: { activity: CandidateProfileActivityEntry[] }) {
  if (activity.length === 0) {
    return <p className="text-sm text-neutral-500">No activity recorded yet.</p>;
  }

  return (
    <ul className="relative space-y-6 before:absolute before:inset-y-0 before:left-3.5 before:w-px before:bg-neutral-200">
      {activity.map((entry) => (
        <li key={entry.id} className="relative flex gap-5 pl-10">
          <div className="absolute left-1.5 top-1.5 h-4 w-4 rounded-full border-4 border-white bg-primary-400" />
          <div>
            <p className="text-sm font-semibold text-neutral-900">{entry.title}</p>
            <p className="mt-1 text-sm text-neutral-600">{entry.description}</p>
            {entry.notes && (
              <p className="mt-1 rounded-md bg-neutral-50 p-2 text-sm text-neutral-600">
                "{entry.notes}"
              </p>
            )}
            <p className="mt-1.5 flex flex-wrap gap-2 text-xs text-neutral-400">
              <span>{formatDate(entry.timestamp)}</span>
              {entry.job_title && <span>{entry.job_title}</span>}
              {entry.actor_email && <span>by {entry.actor_email}</span>}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ResumeSummary({
  resume,
  onOpen,
}: {
  resume: Resume;
  onOpen: (resume: Resume, mode: "view" | "download") => void;
}) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
      <div className="flex items-start gap-3">
        <FileText className="mt-0.5 h-4 w-4 text-neutral-500" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-neutral-900">{resume.file_name}</p>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${RESUME_STATUS_CLASSES[resume.status]}`}
            >
              {resume.status}
            </span>
          </div>
          <p className="text-xs text-neutral-500">{(resume.file_size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onOpen(resume, "view")}
          disabled={!resume.view_url}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-neutral-700 ring-1 ring-inset ring-neutral-200 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          View
        </button>
        <button
          type="button"
          onClick={() => onOpen(resume, "download")}
          disabled={!resume.download_url}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-neutral-700 ring-1 ring-inset ring-neutral-200 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          Download
        </button>
      </div>
    </div>
  );
}

export default function RecruiterCandidateProfilePage() {
  const params = useParams<{ id: string }>();
  const [profile, setProfile] = useState<RecruiterCandidateProfile | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  useEffect(() => {
    let ignore = false;

    getRecruiterCandidateProfile(params.id)
      .then((data) => {
        if (!ignore) setProfile(data);
      })
      .catch(() => {
        if (!ignore) setError("Candidate profile not found.");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [params.id]);

  const allResumes = useMemo(() => {
    if (!profile) return [];
    const resumeMap = new Map<string, Resume>();
    if (profile.latest_resume) resumeMap.set(profile.latest_resume.id, profile.latest_resume);
    profile.applications.forEach((application) => {
      application.resumes?.forEach((resume) => resumeMap.set(resume.id, resume));
    });
    return Array.from(resumeMap.values());
  }, [profile]);

  async function handleCreateNote(event: FormEvent) {
    event.preventDefault();
    if (!profile || !noteBody.trim()) return;
    setIsSavingNote(true);
    try {
      const note = await createCandidateNote(profile.candidate.id, noteBody.trim());
      setProfile({ ...profile, notes: [note, ...profile.notes] });
      setNoteBody("");
    } catch (err) {
      if (isUnauthorizedError(err)) return;
      alert("Failed to save note.");
    } finally {
      setIsSavingNote(false);
    }
  }

  async function handleDeleteNote(note: CandidateNote) {
    if (!profile) return;
    try {
      await deleteCandidateNote(profile.candidate.id, note.id);
      setProfile({ ...profile, notes: profile.notes.filter((item) => item.id !== note.id) });
    } catch (err) {
      if (isUnauthorizedError(err)) return;
      alert("Failed to delete note.");
    }
  }

  async function handleResumeFile(resume: Resume, mode: "view" | "download") {
    const url = mode === "view" ? resume.view_url : resume.download_url;
    if (!url) return;

    const previewWindow = mode === "view" ? window.open("about:blank", "_blank") : null;
    if (previewWindow) {
      previewWindow.opener = null;
    }

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
    }
  }

  if (isLoading) {
    return <div className="py-20 text-center text-sm text-neutral-400">Loading...</div>;
  }

  if (error || !profile) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-danger-600">{error ?? "Failed to load candidate."}</p>
        <Link
          href="/dashboard/candidates"
          className="mt-4 inline-flex text-sm font-medium text-primary-600 hover:underline"
        >
          Back to candidates
        </Link>
      </div>
    );
  }

  const latestApplication = profile.latest_application;
  const parsedResume = profile.parsed_resume ?? profile.latest_resume?.parsed_resume ?? null;

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/candidates"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Candidates
      </Link>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{candidateName(profile)}</h1>
            <div className="mt-4 flex flex-wrap gap-4">
              <a
                href={`mailto:${profile.candidate.email}`}
                className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-primary-600"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                {profile.candidate.email}
              </a>
              {profile.candidate.phone && (
                <a
                  href={`tel:${profile.candidate.phone}`}
                  className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-primary-600"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  {profile.candidate.phone}
                </a>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-md border border-neutral-200 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-neutral-500">Applications</p>
              <p className="mt-1 text-xl font-bold text-neutral-900">{profile.applications.length}</p>
            </div>
            <div className="rounded-md border border-neutral-200 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-neutral-500">Latest score</p>
              <p className="mt-1 text-xl font-bold text-neutral-900">
                {formatScore(latestApplication?.final_score)}
              </p>
            </div>
            {latestApplication?.current_stage && (
              <div className="rounded-md border border-neutral-200 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-neutral-500">Current stage</p>
                <p className="mt-1 text-sm font-semibold text-neutral-900">
                  {latestApplication.current_stage.name}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2 border-b border-neutral-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`border-b-2 px-3 py-2 text-sm font-semibold ${
              activeTab === tab.id
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-neutral-500 hover:text-neutral-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-panel lg:col-span-2">
            <div className="mb-5 flex items-center gap-2">
              <BriefcaseBusiness className="h-5 w-5 text-primary-600" aria-hidden="true" />
              <h2 className="text-base font-semibold text-neutral-900">Applications</h2>
            </div>
            <div className="space-y-3">
              {profile.applications.map((application) => (
                <div
                  key={application.id}
                  className="flex flex-col gap-3 rounded-md border border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <Link
                      href={`/dashboard/applications/${application.id}`}
                      className="font-semibold text-primary-600 hover:text-primary-700"
                    >
                      {application.job_title}
                    </Link>
                    <p className="mt-1 text-sm text-neutral-500">
                      {STATUS_LABEL[application.status]} - {formatDate(application.applied_at)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex h-9 min-w-12 items-center justify-center rounded-full px-3 text-sm font-bold ${scoreTone(application.final_score)}`}
                  >
                    {formatScore(application.final_score)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-panel">
            <div className="mb-5 flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-primary-600" aria-hidden="true" />
              <h2 className="text-base font-semibold text-neutral-900">Recent activity</h2>
            </div>
            <ActivityTimeline activity={profile.activity.slice(0, 5)} />
          </section>
        </div>
      )}

      {activeTab === "resume" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-panel">
            <h2 className="mb-5 text-base font-semibold text-neutral-900">Resumes</h2>
            {allResumes.length === 0 ? (
              <p className="text-sm text-neutral-500">No resume uploaded yet.</p>
            ) : (
              <div className="space-y-3">
                {allResumes.map((resume) => (
                  <ResumeSummary key={resume.id} resume={resume} onOpen={handleResumeFile} />
                ))}
              </div>
            )}
          </section>
          <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-panel">
            <h2 className="mb-5 text-base font-semibold text-neutral-900">Parsed profile</h2>
            <ParsedResumePanel parsedResume={parsedResume} />
          </section>
        </div>
      )}

      {activeTab === "scores" && (
        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-panel">
          <div className="mb-5 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary-600" aria-hidden="true" />
            <h2 className="text-base font-semibold text-neutral-900">Match scores</h2>
          </div>
          {profile.applications.length === 0 ? (
            <p className="text-sm text-neutral-500">No applications to score yet.</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {profile.applications.map((application) => (
                <ApplicationScoreCard key={application.id} application={application} />
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "activity" && (
        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-panel">
          <h2 className="mb-5 text-base font-semibold text-neutral-900">Activity timeline</h2>
          <ActivityTimeline activity={profile.activity} />
        </section>
      )}

      {activeTab === "notes" && (
        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-panel">
          <div className="mb-5 flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-primary-600" aria-hidden="true" />
            <h2 className="text-base font-semibold text-neutral-900">Recruiter notes</h2>
          </div>
          <form onSubmit={handleCreateNote} className="space-y-3">
            <textarea
              value={noteBody}
              onChange={(event) => setNoteBody(event.target.value)}
              rows={3}
              placeholder="Add an internal note for this candidate"
              className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
            <button
              type="submit"
              disabled={isSavingNote || !noteBody.trim()}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingNote ? "Saving..." : "Add note"}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            {profile.notes.length === 0 ? (
              <p className="text-sm text-neutral-500">No notes yet.</p>
            ) : (
              profile.notes.map((note) => (
                <div key={note.id} className="rounded-md border border-neutral-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-neutral-800">{note.body}</p>
                      <p className="mt-2 text-xs text-neutral-400">
                        {formatDate(note.created_at)}
                        {note.author_email ? ` by ${note.author_email}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 hover:bg-danger-50 hover:text-danger-600"
                      aria-label="Delete note"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}
