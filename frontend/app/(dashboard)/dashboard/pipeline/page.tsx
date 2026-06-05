"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronRight, RefreshCw } from "lucide-react";

import { getPipelineBoard } from "@/lib/candidate";
import { getJobs } from "@/lib/jobs";
import { formatScore, scoreTone } from "@/lib/scores";
import type { PipelineBoard, PipelineColumn, CandidateApplication } from "@/types/candidate";
import type { Job } from "@/types/jobs";

// ─── Column colour map ────────────────────────────────────────────────────────

const COLUMN_STYLE: Record<string, { header: string; card: string; dot: string }> = {
  applied:         { header: "bg-primary-50 border-primary-200",   card: "border-primary-100",   dot: "bg-primary-500"   },
  under_review:    { header: "bg-warning-600/10 border-warning-600/20", card: "border-warning-600/10", dot: "bg-warning-600" },
  shortlisted:     { header: "bg-sky-50 border-sky-200",            card: "border-sky-100",       dot: "bg-sky-500"       },
  technical_round: { header: "bg-purple-50 border-purple-200",      card: "border-purple-100",    dot: "bg-purple-500"    },
  hr_round:        { header: "bg-indigo-50 border-indigo-200",      card: "border-indigo-100",    dot: "bg-indigo-500"    },
  offer:           { header: "bg-success-600/10 border-success-600/20", card: "border-success-600/10", dot: "bg-success-600" },
  rejected:        { header: "bg-danger-600/10 border-danger-600/20",   card: "border-danger-600/10", dot: "bg-danger-600"  },
  hired:           { header: "bg-emerald-50 border-emerald-200",    card: "border-emerald-100",   dot: "bg-emerald-500"   },
};

function formatDate(v: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(v));
}

// ─── Card component ───────────────────────────────────────────────────────────

function PipelineCard({ app, style }: { app: CandidateApplication; style: typeof COLUMN_STYLE[string] }) {
  const hasScore = app.final_score !== null && app.final_score !== undefined;

  return (
    <Link
      href={`/dashboard/applications/${app.id}`}
      className={`block rounded-lg border bg-white p-3 shadow-sm hover:shadow-md hover:border-primary-300 transition-all ${style.card}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-neutral-900">
            {app.candidate.first_name} {app.candidate.last_name}
          </p>
          <p className="truncate text-xs text-neutral-500">{app.job_title}</p>
        </div>
        <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-300" aria-hidden="true" />
      </div>
      <p className="mt-2 text-xs text-neutral-400">{app.candidate.email}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-xs text-neutral-400">Applied {formatDate(app.applied_at)}</p>
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold ${scoreTone(app.final_score)}`}
          title={hasScore ? "Overall match score" : "Score not calculated yet"}
        >
          {hasScore ? `${formatScore(app.final_score)} match` : "No score"}
        </span>
      </div>
    </Link>
  );
}

// ─── Column component ─────────────────────────────────────────────────────────

function KanbanColumn({ column }: { column: PipelineColumn }) {
  const style = COLUMN_STYLE[column.status] ?? COLUMN_STYLE.applied;
  return (
    <div className="flex w-64 shrink-0 flex-col rounded-xl border border-neutral-200 bg-neutral-50 overflow-hidden">
      {/* Header */}
      <div className={`flex items-center justify-between border-b px-4 py-3 ${style.header}`}>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${style.dot}`} />
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-700">
            {column.label}
          </span>
        </div>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-neutral-600 shadow-sm">
          {column.count}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        {column.applications.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-400">No candidates</p>
        ) : (
          column.applications.map((app) => (
            <PipelineCard key={app.id} app={app} style={style} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [board, setBoard] = useState<PipelineBoard | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobFilter, setJobFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadBoard = useCallback(
    async (jid?: string) => {
      setIsLoading(true);
      try {
        const data = await getPipelineBoard(jid);
        setBoard(data);
      } catch {
        // handled below
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Initial load — fetch jobs for filter and pipeline board
  useEffect(() => {
    let ignore = false;
    Promise.all([getJobs(), getPipelineBoard()])
      .then(([jobList, boardData]) => {
        if (!ignore) {
          setJobs(jobList);
          setBoard(boardData);
        }
      })
      .catch(() => {})
      .finally(() => { if (!ignore) setIsLoading(false); });
    return () => { ignore = true; };
  }, []);

  function handleJobFilter(jid: string) {
    setJobFilter(jid);
    loadBoard(jid || undefined);
  }

  const totalApplications = board?.columns.reduce((s, c) => s + c.count, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Pipeline</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {totalApplications} total application{totalApplications !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Job filter */}
          <select
            value={jobFilter}
            onChange={(e) => handleJobFilter(e.target.value)}
            className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-primary-500"
          >
            <option value="">All jobs</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
          {/* Refresh */}
          <button
            onClick={() => loadBoard(jobFilter || undefined)}
            className="flex h-9 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {/* Kanban scroll area */}
      {isLoading ? (
        <div className="py-20 text-center text-sm text-neutral-400">Loading pipeline…</div>
      ) : !board ? (
        <div className="py-20 text-center text-sm text-danger-600">Failed to load pipeline.</div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4" style={{ minWidth: "max-content" }}>
            {board.columns.map((col) => (
              <KanbanColumn key={col.status} column={col} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
