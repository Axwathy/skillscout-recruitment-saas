import type { RemotePolicy } from "@/types/jobs";

export type SearchResultType = "candidate" | "job";
export type SearchType = "all" | "candidates" | "jobs";

export interface SearchFilters {
  skills?: string;
  min_experience?: string;
  max_experience?: string;
  location?: string;
  remote_policy?: RemotePolicy | "";
  status?: string;
  limit?: number;
}

export interface SearchResult {
  type: SearchResultType;
  id: string;
  candidate_id?: string;
  application_id?: string | null;
  job_id?: string | null;
  resume_id?: string | null;
  parsed_resume_id?: string | null;
  title: string;
  subtitle: string;
  location: string;
  remote_policy?: RemotePolicy;
  status?: string;
  url: string;
  score: number;
  score_normalized: number;
  semantic_score: number;
  keyword_score: number;
  matched_terms: string[];
  matched_skills: string[];
  skills: string[];
  experience_years?: number | null;
  required_experience_years?: number | null;
  explanation: string;
}

export interface SearchResponse {
  type: SearchType;
  query: string;
  count: number;
  elapsed_ms: number;
  weights: {
    semantic: number;
    keyword: number;
  };
  filters: {
    skills: string[];
    min_experience: number | null;
    max_experience: number | null;
    location: string;
    remote_policy: string;
    status: string;
    limit: number;
  };
  results: SearchResult[];
}
