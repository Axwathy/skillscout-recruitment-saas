export type EmploymentType = "full_time" | "part_time" | "contract" | "internship";
export type JobStatus = "draft" | "published" | "closed" | "archived";
export type RemotePolicy = "onsite" | "hybrid" | "remote";
export type ApplicationStatus =
  | "applied"
  | "under_review"
  | "shortlisted"
  | "technical_round"
  | "hr_round"
  | "offer"
  | "rejected"
  | "hired";

export interface Job {
  id: string;
  organization: string;
  title: string;
  slug: string;
  description: string;
  requirements: string;
  location: string;
  department: string;
  employment_type: EmploymentType;
  remote_policy: RemotePolicy;
  salary_range: string;
  status: JobStatus;
  created_by: string;
  application_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ScoreValue = string | number | null;

export interface ApplicationScoreFields {
  semantic_score: ScoreValue;
  skill_score: ScoreValue;
  experience_score: ScoreValue;
  final_score: ScoreValue;
  score_version: string;
  score_calculated_at: string | null;
}

export interface PublicJob {
  id: string;
  title: string;
  slug: string;
  organization_name: string;
  description: string;
  requirements: string;
  location: string;
  department: string;
  employment_type: EmploymentType;
  remote_policy: RemotePolicy;
  salary_range: string;
  published_at: string | null;
  created_at: string;
}

export interface JobPayload {
  title: string;
  description: string;
  requirements: string;
  location: string;
  department: string;
  employment_type: EmploymentType;
  remote_policy: RemotePolicy;
  salary_range: string;
  status?: JobStatus;
}

export interface Candidate {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  linkedin_url: string;
  github_url: string;
  created_at: string;
}

export interface Application extends ApplicationScoreFields {
  id: string;
  candidate: Candidate;
  job_id: string;
  job_title: string;
  job_slug?: string;
  organization: string;
  organization_name?: string;
  status: ApplicationStatus;
  current_stage?: import("./candidate").PipelineStage | null;
  applied_at: string;
  updated_at: string;
  history?: import("./candidate").ApplicationHistoryEntry[];
  resumes?: import("./candidate").Resume[];
}

export interface RankedCandidate {
  rank: number;
  candidate: {
    id: string;
    name: string;
    email: string;
  };
  application_id: string;
  score: number;
  score_normalized: number;
  breakdown: {
    semantic_match: number;
    skill_match: number;
    experience_match: number;
  };
  breakdown_normalized: {
    semantic_score: number;
    skill_score: number;
    experience_score: number;
    final_score: number;
  };
  matched_skills: string[];
  missing_skills: string[];
  job_skills: string[];
  candidate_skills: string[];
  required_experience_years: number | null;
  candidate_experience_years: number | null;
  score_version: string;
  score_calculated_at: string | null;
}

export interface RankedCandidatesResponse {
  job_id: string;
  count: number;
  results: RankedCandidate[];
}

export interface ApplicationPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  linkedin_url: string;
  github_url: string;
}
