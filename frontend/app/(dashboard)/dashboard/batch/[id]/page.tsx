"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";

import { BatchProgressPanel } from "@/components/BatchProgressPanel";
import { useBatchProgress } from "@/hooks/use-batch-progress";
import { cancelBatch, getBatchProgress, retryBatchItem } from "@/lib/batch";
import type { BatchItem, BatchProgress } from "@/types/batch";

export default function BatchDetailPage() {
  const params = useParams<{ id: string }>();
  const [initial, setInitial] = useState<BatchProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { progress, setProgress, isConnected } = useBatchProgress(params.id, initial);

  useEffect(() => {
    async function load() {
      try {
        setInitial(await getBatchProgress(params.id));
      } catch {
        setError("Could not load batch progress.");
      }
    }
    void load();
  }, [params.id]);

  async function handleRetry(item: BatchItem) {
    setError(null);
    try {
      setProgress(await retryBatchItem(params.id, item.id));
    } catch {
      setError("Could not retry this item.");
    }
  }

  async function handleCancel() {
    setError(null);
    try {
      setProgress(await cancelBatch(params.id));
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
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Batch progress</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Live progress, per-item status, and retry controls for failed items.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-danger-600/20 bg-danger-600/10 px-4 py-3 text-sm text-danger-600">
          {error}
        </div>
      )}

      {progress ? (
        <BatchProgressPanel
          progress={progress}
          isConnected={isConnected}
          onRetry={handleRetry}
          onCancel={handleCancel}
        />
      ) : (
        <p className="py-20 text-center text-sm text-neutral-500">Loading batch...</p>
      )}
    </div>
  );
}
