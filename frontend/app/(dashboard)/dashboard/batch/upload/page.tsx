"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, UploadCloud, X } from "lucide-react";

import { BatchProgressPanel } from "@/components/BatchProgressPanel";
import { useBatchProgress } from "@/hooks/use-batch-progress";
import { cancelBatch, uploadBatchResumes } from "@/lib/batch";
import { getJobs } from "@/lib/jobs";
import type { BatchProgress } from "@/types/batch";
import type { Job } from "@/types/jobs";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export default function BatchUploadPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobId, setJobId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [started, setStarted] = useState<BatchProgress | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { progress, setProgress, isConnected } = useBatchProgress(started?.id ?? null, started);

  useEffect(() => {
    async function loadJobs() {
      try {
        const response = await getJobs({ status: "published" });
        setJobs(response);
        setJobId(response[0]?.id ?? "");
      } catch {
        setError("Could not load jobs.");
      }
    }
    void loadJobs();
  }, []);

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    setError(null);
    const selected = Array.from(event.target.files ?? []);
    const valid = selected.filter((file) => ALLOWED_TYPES.has(file.type));
    if (valid.length !== selected.length) {
      setError("Only PDF and DOCX resumes can be uploaded.");
    }
    setFiles((current) => [...current, ...valid]);
    event.target.value = "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!jobId || files.length === 0) return;
    setIsSubmitting(true);
    setError(null);
    try {
      setStarted(await uploadBatchResumes(jobId, files));
    } catch {
      setError("Could not start bulk upload.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!progress) return;
    try {
      setProgress(await cancelBatch(progress.id));
    } catch {
      setError("Could not cancel this batch.");
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/batch"
        className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to batch history
      </Link>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Bulk resume upload</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Upload multiple resumes to one job and track parsing, candidate creation, and scoring.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-danger-600/20 bg-danger-600/10 px-4 py-3 text-sm text-danger-600">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="glass-panel rounded-lg p-5"
      >
        <label className="block">
          <span className="text-sm font-medium text-neutral-700">Target job</span>
          <select
            value={jobId}
            onChange={(event) => setJobId(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 bg-white/70 px-4 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-900 focus:bg-white"
          >
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-white/50 px-4 py-10 text-center transition-colors hover:border-primary-400 hover:bg-primary-50/40">
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            onChange={handleFiles}
          />
          <UploadCloud className="h-8 w-8 text-neutral-500" />
          <span className="mt-3 text-sm font-semibold text-neutral-900">
            Click to upload resumes
          </span>
          <span className="mt-1 text-xs text-neutral-500">PDF or DOCX, max 10MB each</span>
        </label>

        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            {files.map((file, index) => (
              <div
                key={`${file.name}:${file.size}:${index}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white/60 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-neutral-500" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-900">{file.name}</p>
                    <p className="text-xs text-neutral-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                  className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={!jobId || files.length === 0 || isSubmitting}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-primary-600 px-6 text-sm font-semibold text-white transition-all hover:bg-primary-700 hover:shadow-accent disabled:opacity-50"
        >
          {isSubmitting ? "Starting..." : "Start bulk upload"}
        </button>
      </form>

      {progress && (
        <BatchProgressPanel
          progress={progress}
          isConnected={isConnected}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
