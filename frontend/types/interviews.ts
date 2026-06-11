export type InterviewQuestionCategory =
  | "technical"
  | "behavioral"
  | "situational"
  | "culture_fit"
  | "gap_analysis";

export type InterviewQuestionSource = "ai" | "bank" | "manual";

export interface InterviewQuestionNote {
  id: string;
  author_email: string | null;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface InterviewQuestion {
  id: string;
  category: InterviewQuestionCategory;
  category_label: string;
  question_text: string;
  rationale: string;
  evaluation_criteria: string;
  source: InterviewQuestionSource;
  source_label: string;
  order: number;
  is_pinned: boolean;
  notes: InterviewQuestionNote[];
  created_at: string;
  updated_at: string;
}

export interface InterviewQuestionSet {
  id: string;
  application: string;
  status: "ready" | "error";
  model: string;
  source_context_hash: string;
  generation_errors: string[];
  questions: InterviewQuestion[];
  created_at: string;
  updated_at: string;
}

export interface InterviewQuestionSetResponse {
  question_set: InterviewQuestionSet | null;
}
