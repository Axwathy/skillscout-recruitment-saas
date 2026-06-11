import { apiFetch } from "@/lib/api";
import type {
  CandidateApplication,
  CandidateNote,
  CandidateProfile,
  CandidateRecord,
  PipelineBoard,
  RecruiterCandidateProfile,
} from "@/types/candidate";

// ─── Candidate Portal (role=CANDIDATE) ────────────────────────────────────

export async function getCandidateApplications(): Promise<CandidateApplication[]> {
  return apiFetch<CandidateApplication[]>("/api/v1/candidate/me/applications/", {
    method: "GET",
  });
}

export async function getCandidateApplication(id: string): Promise<CandidateApplication> {
  return apiFetch<CandidateApplication>(`/api/v1/candidate/me/applications/${id}/`, {
    method: "GET",
  });
}

export async function getCandidateProfile(): Promise<CandidateProfile> {
  return apiFetch<CandidateProfile>("/api/v1/candidate/me/profile/", {
    method: "GET",
  });
}

export interface CandidateRegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;
}

export async function candidateRegister(payload: CandidateRegisterPayload): Promise<void> {
  await apiFetch<unknown>("/api/v1/candidate/auth/register/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Recruiter Pipeline (role=RECRUITER) ─────────────────────────────────

export async function getPipelineBoard(jobId?: string): Promise<PipelineBoard> {
  const query = jobId ? `?job=${jobId}` : "";
  return apiFetch<PipelineBoard>(`/api/v1/applications/pipeline/${query}`, { method: "GET" });
}

export async function updateApplicationStatus(
  applicationId: string,
  status: string,
  notes?: string,
  stageId?: string,
): Promise<CandidateApplication> {
  return apiFetch<CandidateApplication>(`/api/v1/applications/${applicationId}/status/`, {
    method: "PATCH",
    body: JSON.stringify({ status, stage_id: stageId, notes: notes ?? "" }),
  });
}

// Recruiter Candidate Dashboard

export async function getRecruiterCandidates(search?: string): Promise<CandidateRecord[]> {
  const query = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  return apiFetch<CandidateRecord[]>(`/api/v1/applications/candidates/${query}`, {
    method: "GET",
  });
}

export async function getRecruiterCandidateProfile(
  candidateId: string,
): Promise<RecruiterCandidateProfile> {
  return apiFetch<RecruiterCandidateProfile>(
    `/api/v1/applications/candidates/${candidateId}/profile/`,
    { method: "GET" },
  );
}

export async function createCandidateNote(
  candidateId: string,
  body: string,
): Promise<CandidateNote> {
  return apiFetch<CandidateNote>(`/api/v1/applications/candidates/${candidateId}/notes/`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export async function updateCandidateNote(
  candidateId: string,
  noteId: string,
  body: string,
): Promise<CandidateNote> {
  return apiFetch<CandidateNote>(
    `/api/v1/applications/candidates/${candidateId}/notes/${noteId}/`,
    {
      method: "PATCH",
      body: JSON.stringify({ body }),
    },
  );
}

export async function deleteCandidateNote(candidateId: string, noteId: string): Promise<void> {
  await apiFetch<void>(`/api/v1/applications/candidates/${candidateId}/notes/${noteId}/`, {
    method: "DELETE",
  });
}
