"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { getPipelineBoard, updateApplicationStatus } from "@/lib/candidate";
import { getJobs } from "@/lib/jobs";
import {
  createPipelineStage,
  deletePipelineStage,
  getPipelineStages,
  reorderPipelineStages,
  updatePipelineStage,
  type PipelineStagePayload,
} from "@/lib/pipeline";
import { scorePercent } from "@/lib/scores";
import { MatchRing } from "@/components/ui/MatchRing";
import type { CandidateApplication, PipelineBoard, PipelineColumn, PipelineStage } from "@/types/candidate";
import type { ApplicationStatus, Job } from "@/types/jobs";

type ColumnStyle = { header: string; card: string; dot: string };

const COLUMN_STYLE: Record<string, ColumnStyle> = {
  applied: { header: "bg-primary-50 border-primary-200", card: "border-primary-100", dot: "bg-primary-500" },
  primary: { header: "bg-primary-50 border-primary-200", card: "border-primary-100", dot: "bg-primary-500" },
  under_review: { header: "bg-warning-600/10 border-warning-600/20", card: "border-warning-600/10", dot: "bg-warning-600" },
  warning: { header: "bg-warning-600/10 border-warning-600/20", card: "border-warning-600/10", dot: "bg-warning-600" },
  shortlisted: { header: "bg-sky-50 border-sky-200", card: "border-sky-100", dot: "bg-sky-500" },
  sky: { header: "bg-sky-50 border-sky-200", card: "border-sky-100", dot: "bg-sky-500" },
  technical_round: { header: "bg-purple-50 border-purple-200", card: "border-purple-100", dot: "bg-purple-500" },
  purple: { header: "bg-purple-50 border-purple-200", card: "border-purple-100", dot: "bg-purple-500" },
  hr_round: { header: "bg-indigo-50 border-indigo-200", card: "border-indigo-100", dot: "bg-indigo-500" },
  indigo: { header: "bg-indigo-50 border-indigo-200", card: "border-indigo-100", dot: "bg-indigo-500" },
  offer: { header: "bg-success-600/10 border-success-600/20", card: "border-success-600/10", dot: "bg-success-600" },
  success: { header: "bg-success-600/10 border-success-600/20", card: "border-success-600/10", dot: "bg-success-600" },
  rejected: { header: "bg-danger-600/10 border-danger-600/20", card: "border-danger-600/10", dot: "bg-danger-600" },
  danger: { header: "bg-danger-600/10 border-danger-600/20", card: "border-danger-600/10", dot: "bg-danger-600" },
  hired: { header: "bg-emerald-50 border-emerald-200", card: "border-emerald-100", dot: "bg-emerald-500" },
  emerald: { header: "bg-emerald-50 border-emerald-200", card: "border-emerald-100", dot: "bg-emerald-500" },
};

const STATUS_OPTIONS: Array<{ value: ApplicationStatus; label: string }> = [
  { value: "applied", label: "Applied" },
  { value: "under_review", label: "Under Review" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "technical_round", label: "Technical Round" },
  { value: "hr_round", label: "HR Round" },
  { value: "offer", label: "Offer" },
  { value: "hired", label: "Hired" },
  { value: "rejected", label: "Rejected" },
];

const COLOR_OPTIONS = [
  "primary",
  "warning",
  "sky",
  "purple",
  "indigo",
  "success",
  "emerald",
  "danger",
];

function columnKey(column: PipelineColumn) {
  return column.stage_id ?? column.id ?? column.status;
}

function columnStyle(column: PipelineColumn) {
  return COLUMN_STYLE[column.color ?? column.status] ?? COLUMN_STYLE.applied;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function moveApplication(board: PipelineBoard, appId: string, targetColumn: PipelineColumn): PipelineBoard {
  let moved: CandidateApplication | undefined;
  const targetKey = columnKey(targetColumn);

  const stripped = board.columns.map((column) => {
    const applications = column.applications.filter((app) => {
      if (app.id === appId) {
        moved = app;
        return false;
      }
      return true;
    });
    return { ...column, applications };
  });

  if (!moved) return board;

  const movedApp: CandidateApplication = {
    ...moved,
    status: targetColumn.status,
    current_stage: targetColumn.stage_id
      ? {
          id: targetColumn.stage_id,
          name: targetColumn.name ?? targetColumn.label,
          status: targetColumn.status,
          order: targetColumn.order ?? 0,
          color: targetColumn.color ?? targetColumn.status,
          is_terminal: Boolean(targetColumn.is_terminal),
        }
      : moved.current_stage,
  };

  const columns = stripped.map((column) =>
    columnKey(column) === targetKey
      ? { ...column, applications: [movedApp, ...column.applications] }
      : column,
  );

  return { ...board, columns: columns.map((column) => ({ ...column, count: column.applications.length })) };
}

function PipelineCard({ app, column }: { app: CandidateApplication; column: PipelineColumn }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: app.id,
    data: {
      columnId: columnKey(column),
      stageId: column.stage_id,
      status: column.status,
    },
  });

  const dragStyle = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const name = `${app.candidate.first_name} ${app.candidate.last_name}`.trim() || app.candidate.email;
  const initials = (app.candidate.first_name?.[0] ?? app.candidate.email[0] ?? "?").toUpperCase();
  const pct = scorePercent(app.final_score);

  return (
    <Link
      ref={setNodeRef}
      href={`/dashboard/applications/${app.id}`}
      draggable={false}
      style={dragStyle}
      {...listeners}
      {...attributes}
      className={`group block cursor-grab touch-none rounded-2xl border border-neutral-100 bg-white p-3.5 shadow-[0_8px_20px_-14px_rgba(26,28,28,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-16px_rgba(26,28,28,0.3)] active:cursor-grabbing ${
        isDragging ? "rotate-2 opacity-70 ring-2 ring-[#EB4425]/40" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EB4425]/10 text-sm font-bold text-[#EB4425]">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-neutral-900">{name}</p>
            <p className="truncate text-xs text-neutral-500">{app.job_title}</p>
          </div>
        </div>
        {pct !== null ? (
          <MatchRing value={pct} size={40} strokeWidth={4} />
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-300">N/A</span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-neutral-100 pt-2.5">
        <span className="truncate text-xs text-neutral-400">{app.candidate.email}</span>
        <span className="shrink-0 text-[11px] font-medium text-neutral-400">
          {formatDate(app.applied_at)}
        </span>
      </div>
    </Link>
  );
}

function KanbanColumn({ column }: { column: PipelineColumn }) {
  const style = columnStyle(column);
  const { setNodeRef, isOver } = useDroppable({ id: columnKey(column) });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-[20px] border p-3 transition-colors ${
        isOver ? "border-[#EB4425]/40 bg-[#EB4425]/5" : "border-neutral-200/70 bg-neutral-100/40"
      }`}
    >
      <div className="flex items-center justify-between px-1.5 pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
          <span className="truncate text-xs font-bold uppercase tracking-wide text-neutral-600">
            {column.label}
          </span>
        </div>
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-2 text-xs font-bold text-neutral-700 shadow-sm">
          {column.count}
        </span>
      </div>

      <div className="flex max-h-[calc(100vh-280px)] min-h-[140px] flex-1 flex-col gap-2.5 overflow-y-auto px-0.5 pb-1">
        {column.applications.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-neutral-300/80 py-10 text-center">
            <p className="text-xs font-medium text-neutral-300">Drop candidates here</p>
          </div>
        ) : (
          column.applications.map((app) => (
            <PipelineCard key={app.id} app={app} column={column} />
          ))
        )}
      </div>
    </div>
  );
}

function StageConfigPanel({
  stages,
  drafts,
  newStage,
  isSaving,
  onDraftChange,
  onNewStageChange,
  onSave,
  onAdd,
  onRemove,
  onMove,
}: {
  stages: PipelineStage[];
  drafts: Record<string, PipelineStagePayload>;
  newStage: PipelineStagePayload;
  isSaving: boolean;
  onDraftChange: (stageId: string, patch: PipelineStagePayload) => void;
  onNewStageChange: (patch: PipelineStagePayload) => void;
  onSave: (stage: PipelineStage) => void;
  onAdd: () => void;
  onRemove: (stage: PipelineStage) => void;
  onMove: (index: number, direction: -1 | 1) => void;
}) {
  return (
    <section className="glass-panel rounded-lg p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">Job stages</h2>
          <p className="mt-1 text-sm text-neutral-500">Rename, color, add, remove, and reorder this job's pipeline stages.</p>
        </div>
      </div>

      <div className="space-y-2">
        {stages.map((stage, index) => {
          const draft = drafts[stage.id] ?? {};
          return (
            <div key={stage.id} className="grid gap-2 rounded-md border border-neutral-200 p-3 md:grid-cols-[1.2fr_1fr_0.8fr_auto_auto] md:items-center">
              <input
                value={draft.name ?? stage.name}
                onChange={(event) => onDraftChange(stage.id, { name: event.target.value })}
                className="h-9 rounded-lg border border-neutral-200 bg-white/70 px-3 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-900 focus:bg-white"
                aria-label="Stage name"
              />
              <select
                value={draft.status ?? stage.status}
                onChange={(event) => onDraftChange(stage.id, { status: event.target.value as ApplicationStatus })}
                className="h-9 rounded-lg border border-neutral-200 bg-white/70 px-3 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-900 focus:bg-white"
                aria-label="Stage status"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select
                value={draft.color ?? stage.color}
                onChange={(event) => onDraftChange(stage.id, { color: event.target.value })}
                className="h-9 rounded-lg border border-neutral-200 bg-white/70 px-3 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-900 focus:bg-white"
                aria-label="Stage color"
              >
                {COLOR_OPTIONS.map((color) => (
                  <option key={color} value={color}>{color}</option>
                ))}
              </select>
              <label className="flex h-9 items-center gap-2 text-sm text-neutral-600">
                <input
                  type="checkbox"
                  checked={draft.is_terminal ?? stage.is_terminal}
                  onChange={(event) => onDraftChange(stage.id, { is_terminal: event.target.checked })}
                  className="h-4 w-4 rounded border-neutral-300"
                />
                Terminal
              </label>
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => onMove(index, -1)}
                  disabled={index === 0 || isSaving}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
                  title="Move stage up"
                >
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onMove(index, 1)}
                  disabled={index === stages.length - 1 || isSaving}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
                  title="Move stage down"
                >
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onSave(stage)}
                  disabled={isSaving}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
                  title="Save stage"
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(stage)}
                  disabled={isSaving}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-danger-600/20 text-danger-600 hover:bg-danger-600/10 disabled:opacity-40"
                  title="Remove stage"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-2 border-t border-neutral-100 pt-4 md:grid-cols-[1.2fr_1fr_0.8fr_auto_auto] md:items-center">
        <input
          value={newStage.name ?? ""}
          onChange={(event) => onNewStageChange({ name: event.target.value })}
          placeholder="New stage name"
          className="h-9 rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-primary-500"
        />
        <select
          value={newStage.status ?? "under_review"}
          onChange={(event) => onNewStageChange({ status: event.target.value as ApplicationStatus })}
          className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-primary-500"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <select
          value={newStage.color ?? "primary"}
          onChange={(event) => onNewStageChange({ color: event.target.value })}
          className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-primary-500"
        >
          {COLOR_OPTIONS.map((color) => (
            <option key={color} value={color}>{color}</option>
          ))}
        </select>
        <label className="flex h-9 items-center gap-2 text-sm text-neutral-600">
          <input
            type="checkbox"
            checked={Boolean(newStage.is_terminal)}
            onChange={(event) => onNewStageChange({ is_terminal: event.target.checked })}
            className="h-4 w-4 rounded border-neutral-300"
          />
          Terminal
        </label>
        <button
          type="button"
          onClick={onAdd}
          disabled={isSaving || !newStage.name}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary-600 px-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add
        </button>
      </div>
    </section>
  );
}

export default function PipelinePage() {
  const [board, setBoard] = useState<PipelineBoard | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobFilter, setJobFilter] = useState("");
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [stageDrafts, setStageDrafts] = useState<Record<string, PipelineStagePayload>>({});
  const [newStage, setNewStage] = useState<PipelineStagePayload>({
    name: "",
    status: "under_review",
    color: "primary",
    is_terminal: false,
  });
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingStage, setIsSavingStage] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === jobFilter),
    [jobFilter, jobs],
  );

  const loadStages = useCallback(async (jobId: string) => {
    const data = await getPipelineStages(jobId);
    setStages(data);
    setStageDrafts({});
  }, []);

  const loadBoard = useCallback(async (jobId?: string) => {
    setIsLoading(true);
    try {
      const data = await getPipelineBoard(jobId);
      setBoard(data);
      if (jobId && isConfigOpen) {
        await loadStages(jobId);
      }
    } catch {
      setBoard(null);
    } finally {
      setIsLoading(false);
    }
  }, [isConfigOpen, loadStages]);

  useEffect(() => {
    let ignore = false;
    Promise.all([getJobs(), getPipelineBoard()])
      .then(([jobList, boardData]) => {
        if (!ignore) {
          setJobs(jobList);
          setBoard(boardData);
        }
      })
      .catch(() => {
        if (!ignore) setBoard(null);
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  async function handleJobFilter(jobId: string) {
    setJobFilter(jobId);
    setIsConfigOpen(false);
    setStages([]);
    await loadBoard(jobId || undefined);
  }

  async function toggleConfig() {
    if (!jobFilter) return;
    const nextValue = !isConfigOpen;
    setIsConfigOpen(nextValue);
    if (nextValue) {
      await loadStages(jobFilter);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || !board) return;

    const targetColumn = board.columns.find((column) => columnKey(column) === String(over.id));
    if (!targetColumn) return;

    const appId = String(active.id);
    const fromColumnId = active.data.current?.columnId as string | undefined;
    if (fromColumnId === columnKey(targetColumn)) return;

    const previous = board;
    setMoveError(null);
    setBoard(moveApplication(board, appId, targetColumn));

    try {
      await updateApplicationStatus(
        appId,
        targetColumn.status,
        undefined,
        targetColumn.stage_id,
      );
    } catch {
      setBoard(previous);
      setMoveError("Couldn't move that candidate. Please try again.");
    }
  }

  function updateStageDraft(stageId: string, patch: PipelineStagePayload) {
    setStageDrafts((current) => ({
      ...current,
      [stageId]: { ...current[stageId], ...patch },
    }));
  }

  function updateNewStage(patch: PipelineStagePayload) {
    setNewStage((current) => ({ ...current, ...patch }));
  }

  async function saveStage(stage: PipelineStage) {
    const payload = stageDrafts[stage.id];
    if (!payload) return;
    setIsSavingStage(true);
    try {
      const updated = await updatePipelineStage(stage.id, payload);
      setStages((current) => current.map((item) => (item.id === stage.id ? updated : item)));
      setStageDrafts((current) => {
        const next = { ...current };
        delete next[stage.id];
        return next;
      });
      await loadBoard(jobFilter);
    } finally {
      setIsSavingStage(false);
    }
  }

  async function addStage() {
    if (!jobFilter || !newStage.name) return;
    setIsSavingStage(true);
    try {
      await createPipelineStage(jobFilter, newStage);
      setNewStage({ name: "", status: "under_review", color: "primary", is_terminal: false });
      await loadStages(jobFilter);
      await loadBoard(jobFilter);
    } finally {
      setIsSavingStage(false);
    }
  }

  async function removeStage(stage: PipelineStage) {
    setIsSavingStage(true);
    try {
      await deletePipelineStage(stage.id);
      await loadStages(jobFilter);
      await loadBoard(jobFilter);
    } finally {
      setIsSavingStage(false);
    }
  }

  async function moveStage(index: number, direction: -1 | 1) {
    if (!jobFilter) return;
    const next = [...stages];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= next.length) return;
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];

    setIsSavingStage(true);
    try {
      const reordered = await reorderPipelineStages(jobFilter, next.map((stage) => stage.id));
      setStages(reordered);
      await loadBoard(jobFilter);
    } finally {
      setIsSavingStage(false);
    }
  }

  const totalApplications = board?.columns.reduce((sum, column) => sum + column.count, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EB4425]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#EB4425]">
            Hiring board
          </span>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-neutral-900">Pipeline</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {totalApplications} total application{totalApplications !== 1 ? "s" : ""} · drag a card to move a candidate between stages
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={jobFilter}
            onChange={(event) => void handleJobFilter(event.target.value)}
            className="h-10 rounded-full border border-neutral-200 bg-white px-4 text-sm text-neutral-700 outline-none transition-colors focus:border-neutral-900"
          >
            <option value="">All jobs</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void toggleConfig()}
            disabled={!jobFilter}
            className="flex h-10 items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-900 disabled:opacity-40"
            title={jobFilter ? "Configure stages" : "Select a job to configure stages"}
          >
            {isConfigOpen ? <X className="h-3.5 w-3.5" aria-hidden="true" /> : <Settings className="h-3.5 w-3.5" aria-hidden="true" />}
            Stages
          </button>
          <button
            type="button"
            onClick={() => void loadBoard(jobFilter || undefined)}
            className="flex h-10 items-center gap-1.5 rounded-full bg-[#EB4425] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(235,68,37,0.5)] transition-all hover:bg-[#D93719]"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {selectedJob && isConfigOpen && (
        <StageConfigPanel
          stages={stages}
          drafts={stageDrafts}
          newStage={newStage}
          isSaving={isSavingStage}
          onDraftChange={updateStageDraft}
          onNewStageChange={updateNewStage}
          onSave={(stage) => void saveStage(stage)}
          onAdd={() => void addStage()}
          onRemove={(stage) => void removeStage(stage)}
          onMove={(index, direction) => void moveStage(index, direction)}
        />
      )}

      {moveError && (
        <div className="rounded-md border border-danger-600/20 bg-danger-600/10 px-4 py-2 text-sm text-danger-600">
          {moveError}
        </div>
      )}

      {isLoading ? (
        <div className="py-20 text-center text-sm text-neutral-400">Loading pipeline...</div>
      ) : !board ? (
        <div className="py-20 text-center text-sm text-danger-600">Failed to load pipeline.</div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-5" style={{ minWidth: "max-content" }}>
              {board.columns.map((column) => (
                <KanbanColumn key={columnKey(column)} column={column} />
              ))}
            </div>
          </div>
        </DndContext>
      )}
    </div>
  );
}
