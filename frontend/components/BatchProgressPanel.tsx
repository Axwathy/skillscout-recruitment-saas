"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, RotateCcw, XCircle } from "lucide-react";

import type { BatchItem, BatchProgress } from "@/types/batch";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  running: "Running",
  cancel_requested: "Cancel requested",
  canceled: "Canceled",
  completed: "Completed",
  completed_with_errors: "Completed with errors",
  failed: "Failed",
};

const ITEM_TONE: Record<string, string> = {
  pending: "bg-neutral-100 text-neutral-600",
  running: "bg-primary-50 text-primary-700",
  cancel_requested: "bg-warning-600/10 text-warning-700",
  canceled: "bg-neutral-200 text-neutral-700",
  completed: "bg-success-600/10 text-success-700",
  failed: "bg-danger-600/10 text-danger-700",
};

export function BatchProgressPanel({
  progress,
  isConnected,
  onRetry,
  onCancel,
}: {
  progress: BatchProgress;
  isConnected?: boolean;
  onRetry?: (item: BatchItem) => void;
  onCancel?: () => void;
}) {
  const percent =
    progress.total_count > 0
      ? Math.round((progress.processed_count / progress.total_count) * 100)
      : 0;
  const hasFailures = progress.failed_count > 0;

  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">
            {STATUS_LABEL[progress.status] ?? progress.status}
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            {progress.processed_count} of {progress.total_count} item
            {progress.total_count === 1 ? "" : "s"} processed
            {hasFailures ? ` - ${progress.failed_count} failed` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {onCancel && ["pending", "running"].includes(progress.status) && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-2 rounded-md border border-danger-600/20 px-3 py-1.5 text-xs font-semibold text-danger-700 hover:bg-danger-50"
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancel
            </button>
          )}
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            {isConnected ? (
              <CheckCircle2 className="h-4 w-4 text-success-600" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
            )}
            {isConnected ? "Live" : "Polling"}
          </div>
        </div>
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full bg-primary-600 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-2 text-right text-xs font-medium text-neutral-500">{percent}%</div>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Error</th>
              <th className="px-3 py-2">Record</th>
              {onRetry && <th className="px-3 py-2">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200/70">
            {progress.items.map((item) => (
              <tr key={item.id}>
                <td className="px-3 py-3 font-medium text-neutral-900">{item.label}</td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      ITEM_TONE[item.status]
                    }`}
                  >
                    {STATUS_LABEL[item.status] ?? item.status}
                  </span>
                </td>
                <td className="max-w-md px-3 py-3 text-neutral-600">
                  {item.error ? (
                    <span className="inline-flex items-start gap-1 text-danger-700">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {item.error}
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-3 py-3 text-neutral-600">
                  {item.application_id ? (
                    <Link
                      href={`/dashboard/applications/${item.application_id}`}
                      className="font-medium text-primary-600 hover:text-primary-700"
                    >
                      Application
                    </Link>
                  ) : (
                    "-"
                  )}
                </td>
                {onRetry && (
                  <td className="px-3 py-3">
                    {item.status === "failed" ? (
                      <button
                        type="button"
                        onClick={() => onRetry(item)}
                        className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Retry
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
