import { apiFetch } from "@/lib/api";
import type {
  Application,
  ApplicationPayload,
  Job,
  JobPayload,
  PublicJob,
  RankedCandidatesResponse,
} from "@/types/jobs";

export interface JobsFilter {
  status?: string;
  search?: string;
  department?: string;
  location?: string;
  remote_policy?: string;
}

export async function getJobs(filters: JobsFilter = {}): Promise<Job[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.department) params.set("department", filters.department);
  if (filters.location) params.set("location", filters.location);
  if (filters.remote_policy) params.set("remote_policy", filters.remote_policy);
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<Job[]>(`/api/v1/jobs/${query}`, { method: "GET" });
}

export async function createJob(payload: JobPayload): Promise<Job> {
  return apiFetch<Job>("/api/v1/jobs/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getJob(id: string): Promise<Job> {
  return apiFetch<Job>(`/api/v1/jobs/${id}/`, { method: "GET" });
}

export async function updateJob(id: string, payload: Partial<JobPayload>): Promise<Job> {
  return apiFetch<Job>(`/api/v1/jobs/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteJob(id: string): Promise<void> {
  return apiFetch<void>(`/api/v1/jobs/${id}/`, { method: "DELETE" });
}

export async function publishJob(id: string): Promise<Job> {
  return apiFetch<Job>(`/api/v1/jobs/${id}/publish/`, { method: "POST" });
}

export async function unpublishJob(id: string): Promise<Job> {
  return apiFetch<Job>(`/api/v1/jobs/${id}/unpublish/`, { method: "POST" });
}

export async function closeJob(id: string): Promise<Job> {
  return apiFetch<Job>(`/api/v1/jobs/${id}/close/`, { method: "POST" });
}

export async function archiveJob(id: string): Promise<Job> {
  return apiFetch<Job>(`/api/v1/jobs/${id}/archive/`, { method: "POST" });
}

export async function getRankedCandidates(
  id: string,
  options: { force?: boolean; limit?: number } = {},
): Promise<RankedCandidatesResponse> {
  const params = new URLSearchParams();
  if (options.force) params.set("force", "true");
  if (options.limit) params.set("limit", String(options.limit));
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<RankedCandidatesResponse>(`/api/v1/jobs/${id}/ranked-candidates/${query}`, {
    method: "GET",
  });
}

export async function getPublicJobs(): Promise<PublicJob[]> {
  return apiFetch<PublicJob[]>("/api/v1/jobs/public/", { method: "GET" });
}

export async function getPublicJob(slug: string): Promise<PublicJob> {
  return apiFetch<PublicJob>(`/api/v1/jobs/public/${slug}/`, { method: "GET" });
}

export async function applyToJob(
  jobId: string,
  payload: ApplicationPayload,
  resume?: File | null,
): Promise<Application> {
  if (resume) {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      formData.append(key, value ?? "");
    });
    formData.append("resume", resume);

    return apiFetch<Application>(`/api/v1/jobs/${jobId}/apply/`, {
      method: "POST",
      body: formData,
    });
  }

  return apiFetch<Application>(`/api/v1/jobs/${jobId}/apply/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
