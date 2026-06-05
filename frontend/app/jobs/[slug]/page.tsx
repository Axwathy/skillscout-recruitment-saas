"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FileText, Send, UploadCloud, X } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";

import { getApiErrorMessage } from "@/lib/api";
import { applyToJob, getPublicJob } from "@/lib/jobs";
import type { ApplicationPayload, PublicJob } from "@/types/jobs";

const initialForm: ApplicationPayload = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  linkedin_url: "",
  github_url: "",
};

function employmentLabel(value: string) {
  return value.replace("_", " ");
}

export default function PublicJobDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, refreshSession } = useAuth();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [job, setJob] = useState<PublicJob | null>(null);
  const [form, setForm] = useState<ApplicationPayload>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeInputKey, setResumeInputKey] = useState(0);

  // Check session on mount (public layout doesn't call refreshSession)
  useEffect(() => {
    refreshSession().finally(() => setSessionChecked(true));
  }, [refreshSession]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (sessionChecked && !authLoading && !isAuthenticated) {
      router.push(`/login?callbackUrl=/jobs/${params.slug}`);
    }
  }, [sessionChecked, authLoading, isAuthenticated, router, params.slug]);

  useEffect(() => {
    if (!sessionChecked || !isAuthenticated) return;

    async function loadJob() {
      try {
        setJob(await getPublicJob(params.slug));
      } catch {
        setError("Could not load this job.");
      } finally {
        setIsLoading(false);
      }
    }

    loadJob();
  }, [params.slug, isAuthenticated, sessionChecked]);

  function updateField(field: keyof ApplicationPayload, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleResumeChange(file: File | undefined) {
    setError(null);
    if (!file) {
      setResumeFile(null);
      return;
    }

    const allowedTypes = new Set([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]);
    if (!allowedTypes.has(file.type)) {
      setResumeFile(null);
      setResumeInputKey((key) => key + 1);
      setError("Resume must be a PDF or DOCX file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setResumeFile(null);
      setResumeInputKey((key) => key + 1);
      setError("Resume file size must be under 10MB.");
      return;
    }

    setResumeFile(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!job) return;
    if (!resumeFile) {
      setError("Please upload your resume before submitting.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await applyToJob(job.id, form, resumeFile);
      setSuccess(true);
      setForm(initialForm);
      setResumeFile(null);
      setResumeInputKey((key) => key + 1);
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, "Could not submit application. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!sessionChecked || authLoading || (!isAuthenticated) || isLoading) {
    return (
      <main className="min-h-screen bg-neutral-50 p-8 text-sm text-neutral-500">
        Loading...
      </main>
    );
  }

  if (!job) {
    return (
      <main className="min-h-screen bg-neutral-50 p-8 text-sm text-danger-600">
        {error || "Job not found."}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/jobs" className="text-sm font-medium text-neutral-700 hover:text-neutral-900">
            Back to jobs
          </Link>
          <Link
            href="/login"
            className="rounded-md px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Recruiter sign in
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
        <article className="space-y-6">
          <div>
            <p className="text-sm font-medium text-primary-600">{job.organization_name}</p>
            <h1 className="mt-2 text-3xl font-semibold text-neutral-900">{job.title}</h1>
            <p className="mt-3 text-sm text-neutral-600">
              {job.location} · {employmentLabel(job.employment_type)}
              {job.salary_range ? ` · ${job.salary_range}` : ""}
            </p>
          </div>

          <section className="rounded-md border border-neutral-200 bg-white p-6 shadow-panel">
            <h2 className="text-base font-semibold text-neutral-900">Description</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-neutral-700">
              {job.description}
            </p>
          </section>

          <section className="rounded-md border border-neutral-200 bg-white p-6 shadow-panel">
            <h2 className="text-base font-semibold text-neutral-900">Requirements</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-neutral-700">
              {job.requirements}
            </p>
          </section>
        </article>

        <aside className="h-fit rounded-md border border-neutral-200 bg-white p-6 shadow-panel">
          <h2 className="text-base font-semibold text-neutral-900">Apply</h2>
          {success && (
            <div className="mt-4 rounded-md border border-success-600/20 bg-success-600/10 px-3 py-2 text-sm text-success-600">
              Application submitted.
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-md border border-danger-600/20 bg-danger-600/10 px-3 py-2 text-sm text-danger-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <label className="block">
                <span className="text-sm font-medium text-neutral-700">First name</span>
                <input
                  value={form.first_name}
                  onChange={(event) => updateField("first_name", event.target.value)}
                  required
                  className="mt-1 h-10 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-primary-500"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-neutral-700">Last name</span>
                <input
                  value={form.last_name}
                  onChange={(event) => updateField("last_name", event.target.value)}
                  required
                  className="mt-1 h-10 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-primary-500"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-neutral-700">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                required
                className="mt-1 h-10 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-primary-500"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-neutral-700">Phone</span>
              <input
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-primary-500"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-neutral-700">LinkedIn URL</span>
              <input
                type="url"
                value={form.linkedin_url}
                onChange={(event) => updateField("linkedin_url", event.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-primary-500"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-neutral-700">GitHub URL</span>
              <input
                type="url"
                value={form.github_url}
                onChange={(event) => updateField("github_url", event.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-primary-500"
              />
            </label>
            <div>
              <span className="text-sm font-medium text-neutral-700">Resume</span>
              <label className="mt-1 flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-center transition hover:border-primary-400 hover:bg-primary-50/40">
                <input
                  key={resumeInputKey}
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  required
                  className="sr-only"
                  onChange={(event) => handleResumeChange(event.target.files?.[0])}
                />
                <UploadCloud className="h-8 w-8 text-neutral-500" aria-hidden="true" />
                <span className="mt-3 text-sm font-semibold text-neutral-900">
                  Click to upload resume
                </span>
                <span className="mt-1 text-xs text-neutral-500">
                  PDF or DOCX, max 10MB
                </span>
              </label>
              {resumeFile && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-neutral-500" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900">{resumeFile.name}</p>
                      <p className="text-xs text-neutral-500">
                        {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setResumeFile(null);
                      setResumeInputKey((key) => key + 1);
                    }}
                    className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                    aria-label="Remove resume"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {isSubmitting ? "Submitting..." : "Submit application"}
            </button>
          </form>
        </aside>
      </div>
    </main>
  );
}
