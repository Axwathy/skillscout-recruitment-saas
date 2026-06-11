import { apiFetch } from "@/lib/api";
import type {
  InterviewQuestionNote,
  InterviewQuestionSetResponse,
} from "@/types/interviews";

export async function getInterviewQuestions(
  applicationId: string,
): Promise<InterviewQuestionSetResponse> {
  return apiFetch<InterviewQuestionSetResponse>(
    `/api/v1/interviews/applications/${applicationId}/questions/`,
    { method: "GET" },
  );
}

export async function generateInterviewQuestions(
  applicationId: string,
  force = false,
): Promise<InterviewQuestionSetResponse> {
  const query = force ? "?force=true" : "";
  return apiFetch<InterviewQuestionSetResponse>(
    `/api/v1/interviews/applications/${applicationId}/generate/${query}`,
    { method: "POST" },
  );
}

export async function createInterviewQuestionNote(
  questionId: string,
  body: string,
): Promise<InterviewQuestionNote> {
  return apiFetch<InterviewQuestionNote>(
    `/api/v1/interviews/questions/${questionId}/notes/`,
    {
      method: "POST",
      body: JSON.stringify({ body }),
    },
  );
}
