import { apiFetch } from "@/lib/api";
import { apiClient } from "@/lib/api/client";
import type { Resume } from "@/types/candidate";
import type { Application } from "@/types/jobs";

export async function getApplications(jobId?: string): Promise<Application[]> {
  const query = jobId ? `?job=${jobId}` : "";
  return apiFetch<Application[]>(`/api/v1/applications/${query}`, { method: "GET" });
}

export async function getApplication(id: string): Promise<Application> {
  return apiFetch<Application>(`/api/v1/applications/${id}/`, { method: "GET" });
}

export async function reparseResume(id: string): Promise<Resume> {
  return apiFetch<Resume>(`/api/v1/resumes/${id}/reparse/`, { method: "POST" });
}

export async function getResumeFile(url: string): Promise<Blob> {
  const response = await apiClient.get<Blob>(url, {
    responseType: "blob",
    headers: {
      Accept: "application/pdf,application/octet-stream,*/*",
    },
  });
  return response.data;
}
