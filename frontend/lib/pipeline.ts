import { apiFetch } from "@/lib/api";
import type { PipelineStage } from "@/types/candidate";
import type { ApplicationStatus } from "@/types/jobs";

export interface PipelineStagePayload {
  name?: string;
  status?: ApplicationStatus;
  order?: number;
  color?: string;
  is_terminal?: boolean;
  auto_actions?: Record<string, unknown>;
}

export async function getPipelineStages(jobId: string): Promise<PipelineStage[]> {
  return apiFetch<PipelineStage[]>(`/api/v1/pipeline/jobs/${jobId}/stages/`, {
    method: "GET",
  });
}

export async function createPipelineStage(
  jobId: string,
  payload: PipelineStagePayload,
): Promise<PipelineStage> {
  return apiFetch<PipelineStage>(`/api/v1/pipeline/jobs/${jobId}/stages/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updatePipelineStage(
  stageId: string,
  payload: PipelineStagePayload,
): Promise<PipelineStage> {
  return apiFetch<PipelineStage>(`/api/v1/pipeline/stages/${stageId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deletePipelineStage(stageId: string): Promise<void> {
  await apiFetch<void>(`/api/v1/pipeline/stages/${stageId}/`, {
    method: "DELETE",
  });
}

export async function reorderPipelineStages(
  jobId: string,
  stageIds: string[],
): Promise<PipelineStage[]> {
  return apiFetch<PipelineStage[]>("/api/v1/pipeline/stages/reorder/", {
    method: "PATCH",
    body: JSON.stringify({ job_id: jobId, stage_ids: stageIds }),
  });
}
