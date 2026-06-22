import type { ApplicationScoreFields, ApplicationStatus } from "@/types/jobs";

export type ProcessingStatus = "pending" | "processing" | "completed" | "error";
export type ParsingConfidence = "high" | "medium" | "low";

export interface ApplicationHistoryEntry {
  id: string;
  from_status: string;
  to_status: string;
  changed_by_email: string | null;
  notes: string;
  changed_at: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  status: ApplicationStatus;
  order: number;
  color: string;
  is_terminal: boolean;
  auto_actions?: Record<string, unknown>;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Resume {
  id: string;
  candidate: string;
  application: string | null;
  file_name: string;
  file_size: number;
  mime_type: string;
  status: ProcessingStatus;
  view_url: string | null;
  download_url: string | null;
  parsed_resume: ParsedResume | null;
  created_at: string;
}

export interface ParsedResume {
  id: string;
  status: ProcessingStatus;
  schema_version: number;
  data: ParsedResumeData;
  confidence: ParsingConfidence;
  parser_model: string;
  validation_errors: string[];
  token_usage: Record<string, number | string | null>;
  estimated_cost: string;
  parsed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParsedResumeData {
  personal_info?: {
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
    location?: string | null;
    linkedin_url?: string | null;
    github_url?: string | null;
    portfolio_url?: string | null;
  };
  summary?: string | null;
  skills?: Array<{
    name: string;
    proficiency?: string;
    category?: string;
    years_used?: number | null;
  }>;
  experience?: Array<{
    company?: string;
    role?: string;
    start_date?: string;
    end_date?: string | null;
    location?: string | null;
    description?: string | null;
    achievements?: string[];
  }>;
  projects?: Array<{
    name?: string;
    start_date?: string | null;
    end_date?: string | null;
    description?: string | null;
    technologies?: string[];
    achievements?: string[];
    url?: string | null;
  }>;
  education?: Array<{
    institution?: string;
    degree?: string | null;
    field_of_study?: string | null;
    graduation_year?: number | null;
    gpa?: string | null;
  }>;
  certifications?: Array<{
    name?: string;
    issuer?: string | null;
    year?: number | null;
    credential_id?: string | null;
  }>;
  languages?: Array<{
    language?: string;
    proficiency?: string;
  }>;
  _metadata?: {
    // Mirrors ParsedResume.confidence when parser metadata includes source-level detail.
    parsing_confidence?: ParsingConfidence;
    parsing_notes?: string[];
    total_years_experience?: number | null;
  };
}

export interface CandidateApplication extends ApplicationScoreFields {
  id: string;
  candidate: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    linkedin_url: string;
    github_url: string;
    created_at: string;
  };
  job_id: string;
  job_title: string;
  job_slug: string;
  organization: string;
  organization_name: string;
  status: ApplicationStatus;
  current_stage: PipelineStage | null;
  applied_at: string;
  updated_at: string;
  history?: ApplicationHistoryEntry[];
  resumes?: Resume[];
}

export interface ProfileProject {
  name: string;
  description: string;
}

export interface ProfileExperience {
  role: string;
  company: string;
  description: string;
}

export interface CandidateProfileFields {
  state: string;
  country: string;
  years_of_experience: number | string | null;
  institution: string;
  cgpa: string;
  skills: string[];
  projects: ProfileProject[];
  experience_entries: ProfileExperience[];
  certifications: string[];
}

export interface CandidateRecord extends CandidateProfileFields {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  linkedin_url: string;
  github_url: string;
  resumes?: Resume[];
  created_at: string;
}

export interface CandidateProfile extends CandidateProfileFields {
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  linkedin_url: string;
  github_url: string;
  application_count: number;
  created_at?: string;
}

export interface JobRecommendation {
  id: string;
  slug: string;
  title: string;
  organization_name: string;
  location: string;
  employment_type: string;
  remote_policy: string;
  salary_range: string;
  match_score: number | null;
  matched_skills: number;
}

export interface CandidateNote {
  id: string;
  candidate: string;
  author_email: string | null;
  body: string;
  created_at: string;
  updated_at: string;
}

export type CandidateProfileActivityType =
  | "application_submitted"
  | "status_change"
  | "stage_change"
  | "resume_uploaded"
  | "resume_parsed";

export interface CandidateProfileActivityEntry {
  id: string;
  type: CandidateProfileActivityType;
  timestamp: string;
  application_id: string | null;
  job_id: string | null;
  job_title: string | null;
  title: string;
  description: string;
  notes?: string;
  actor_email: string | null;
}

export interface RecruiterCandidateProfile {
  candidate: CandidateRecord;
  latest_application: CandidateApplication | null;
  applications: CandidateApplication[];
  latest_resume: Resume | null;
  parsed_resume: ParsedResume | null;
  activity: CandidateProfileActivityEntry[];
  notes: CandidateNote[];
}

export interface PipelineColumn {
  id?: string;
  stage_id?: string;
  status: ApplicationStatus;
  label: string;
  name?: string;
  order?: number;
  color?: string;
  is_terminal?: boolean;
  count: number;
  applications: CandidateApplication[];
}

export interface PipelineBoard {
  job_id?: string;
  columns: PipelineColumn[];
}
