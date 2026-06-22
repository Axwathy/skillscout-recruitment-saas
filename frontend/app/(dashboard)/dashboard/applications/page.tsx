"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, RefreshCcw } from "lucide-react";

import { createBatchPipelineAction } from "@/lib/batch";
import { getApplications } from "@/lib/applications";
import type { Application, ApplicationStatus } from "@/types/jobs";
import type { BatchPipelineAction } from "@/types/batch";

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
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BatchPipelineAction>("reject");
  const [targetStatus, setTargetStatus] = useState<ApplicationStatus>("under_review");
  const [isBatching, setIsBatching] = useState(false);

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

  const allSelected = applications.length > 0 && selectedIds.size === applications.length;

  function toggleApplication(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((current) => {
      if (current.size === applications.length) return new Set();
      return new Set(applications.map((application) => application.id));
    });
  }

  async function runBulkAction() {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(
      `Run ${bulkAction.replace("_", " ")} on ${selectedIds.size} application${
        selectedIds.size === 1 ? "" : "s"
      }?`,
    );
    if (!confirmed) return;

    setIsBatching(true);
    setError(null);
    try {
      const batch = await createBatchPipelineAction({
        action: bulkAction,
        application_ids: Array.from(selectedIds),
        target_status: bulkAction === "move" ? targetStatus : undefined,
      });
      router.push(`/dashboard/batch/${batch.id}`);
    } catch {
      setError("Could not start batch action.");
    } finally {
      setIsBatching(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Applications</h1>
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

      <div className="glass-panel flex flex-wrap items-end gap-3 rounded-lg p-4">
        <div>
          <p className="text-xs font-semibold uppercase text-neutral-500">Selected</p>
          <p className="text-sm font-medium text-neutral-900">{selectedIds.size} applications</p>
        </div>
        <label className="block">
          <span className="text-xs font-semibold uppercase text-neutral-500">Bulk action</span>
          <select
            value={bulkAction}
            onChange={(event) => setBulkAction(event.target.value as BatchPipelineAction)}
            className="mt-1 h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-primary-500"
          >
            <option value="reject">Reject</option>
            <option value="archive">Archive</option>
            <option value="move">Move to status</option>
          </select>
        </label>
        {bulkAction === "move" && (
          <label className="block">
            <span className="text-xs font-semibold uppercase text-neutral-500">Target</span>
            <select
              value={targetStatus}
              onChange={(event) => setTargetStatus(event.target.value as ApplicationStatus)}
              className="mt-1 h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-primary-500"
            >
              {Object.entries(STATUS_LABEL).map(([status, label]) => (
                <option key={status} value={status}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          onClick={runBulkAction}
          disabled={selectedIds.size === 0 || isBatching}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
        >
          <Play className="h-4 w-4" />
          {isBatching ? "Starting..." : "Run batch"}
        </button>
        <Link
          href="/dashboard/batch"
          className="inline-flex h-10 items-center rounded-md border border-neutral-200 px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          Batch history
        </Link>
      </div>

      {error && (
        <div className="rounded-md border border-danger-600/20 bg-danger-600/10 px-4 py-3 text-sm text-danger-600">
          {error}
        </div>
      )}

      <div className="glass-panel overflow-x-auto rounded-lg">
        <table className="min-w-full divide-y divide-neutral-200/70">
          <thead className="bg-white/40">
            <tr>
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all applications"
                  className="h-4 w-4 rounded border-neutral-300 text-primary-600"
                />
              </th>
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
          <tbody className="divide-y divide-neutral-200/70">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-neutral-500">
                  Loading applications...
                </td>
              </tr>
            ) : applications.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-neutral-500">
                  No applications found.
                </td>
              </tr>
            ) : (
              applications.map((application) => (
                <tr key={application.id}>
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(application.id)}
                      onChange={() => toggleApplication(application.id)}
                      aria-label={`Select ${application.candidate.first_name} ${application.candidate.last_name}`}
                      className="h-4 w-4 rounded border-neutral-300 text-primary-600"
                    />
                  </td>
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
