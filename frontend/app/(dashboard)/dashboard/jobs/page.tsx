"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BarChart3, EyeOff, LockKeyhole, Plus, RefreshCcw, Search, Trash2 } from "lucide-react";

import { closeJob, deleteJob, getJobs, publishJob, unpublishJob } from "@/lib/jobs";
import type { Job, JobStatus } from "@/types/jobs";

const statusLabels: Record<JobStatus, string> = {
  draft: "Draft",
  published: "Published",
  closed: "Closed",
  archived: "Archived",
};

const statusClasses: Record<JobStatus, string> = {
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

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [statusFilter, setStatusFilter] = useState<JobStatus | "">("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // debounce timer ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadJobs = useCallback(
    async (overrides?: { status?: string; search?: string; department?: string }) => {
      setIsLoading(true);
      setError(null);
      try {
        const filters = {
          status: overrides?.status ?? statusFilter,
          search: overrides?.search ?? search,
          department: overrides?.department ?? department,
        };
        setJobs(await getJobs(filters));
      } catch {
        setError("Could not load jobs.");
      } finally {
        setIsLoading(false);
      }
    },
    [statusFilter, search, department],
  );

  // Initial load
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const data = await getJobs();
        if (!ignore) setJobs(data);
      } catch {
        if (!ignore) setError("Could not load jobs.");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  // Debounced search/department/status re-fetch
  function triggerFetch(overrides?: { status?: string; search?: string; department?: string }) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadJobs(overrides), 300);
  }

  function handleStatusChange(value: JobStatus | "") {
    setStatusFilter(value);
    triggerFetch({ status: value });
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    triggerFetch({ search: value });
  }

  function handleDepartmentChange(value: string) {
    setDepartment(value);
    triggerFetch({ department: value });
  }

  async function updateStatus(job: Job) {
    const updated =
      job.status === "published" ? await unpublishJob(job.id) : await publishJob(job.id);
    setJobs((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }

  async function handleClose(job: Job) {
    const updated = await closeJob(job.id);
    setJobs((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }

  async function handleDelete(job: Job) {
    const confirmed = window.confirm(`Delete "${job.title}"? This removes it from the jobs list.`);
    if (!confirmed) return;

    await deleteJob(job.id);
    setJobs((current) => current.filter((item) => item.id !== job.id));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Jobs</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Manage job postings for your organization.
          </p>
        </div>
        <Link
          href="/dashboard/jobs/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New job
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-neutral-200 bg-white p-3 shadow-panel">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search jobs..."
            className="h-10 w-full rounded-md border border-neutral-200 bg-white pl-9 pr-3 text-sm text-neutral-700 outline-none focus:border-primary-500"
          />
        </div>

        {/* Department filter */}
        <input
          type="text"
          value={department}
          onChange={(e) => handleDepartmentChange(e.target.value)}
          placeholder="Department"
          className="h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-primary-500"
        />

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value as JobStatus | "")}
          className="h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-primary-500"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="closed">Closed</option>
          <option value="archived">Archived</option>
        </select>

        <button
          type="button"
          onClick={() => loadJobs()}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-neutral-200 px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
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
                Job
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-neutral-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-neutral-500">
                Applications
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-neutral-500">
                Created
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-neutral-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-neutral-500">
                  Loading jobs...
                </td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-neutral-500">
                  No jobs found.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id}>
                  <td className="px-4 py-4">
                    <div className="font-medium text-neutral-900">{job.title}</div>
                    <div className="text-sm text-neutral-500">
                      {job.location}
                      {job.department ? ` · ${job.department}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[job.status]}`}
                    >
                      {statusLabels[job.status]}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-neutral-700">{job.application_count}</td>
                  <td className="px-4 py-4 text-sm text-neutral-700">
                    {formatDate(job.created_at)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/dashboard/jobs/${job.id}`}
                        className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-200 px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                        title="View / edit job"
                      >
                        View
                      </Link>
                      <Link
                        href={`/dashboard/jobs/${job.id}#ranked-candidates`}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-primary-600/30 bg-primary-50 px-3 text-sm font-semibold text-primary-700 hover:bg-primary-100"
                        title="Open ranked candidates"
                      >
                        <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
                        Ranking
                      </Link>
                      {job.status === "draft" ||
                      job.status === "published" ||
                      job.status === "closed" ? (
                        <button
                          type="button"
                          onClick={() => updateStatus(job)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-neutral-200 px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                        >
                          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                          {job.status === "published"
                            ? "Unpublish"
                            : job.status === "closed"
                              ? "Republish"
                              : "Publish"}
                        </button>
                      ) : null}
                      {job.status === "published" && (
                        <button
                          type="button"
                          onClick={() => handleClose(job)}
                          title="Close job — stop accepting applications"
                          className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-200 px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                        >
                          <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                      {job.status !== "archived" && (
                        <button
                          type="button"
                          onClick={() => handleDelete(job)}
                          className="inline-flex h-9 items-center justify-center rounded-md border border-danger-600/30 px-3 text-sm font-medium text-danger-600 hover:bg-danger-600/10"
                          title="Delete job"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
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
