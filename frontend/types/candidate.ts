import type { ApplicationScoreFields, ApplicationStatus } from "@/types/jobs";

export interface ApplicationHistoryEntry {
  id: string;
  from_status: string;
  to_status: string;
  changed_by_email: string | null;
  notes: string;
  changed_at: string;
}

export interface Resume {
  id: string;
  candidate: string;
  application: string | null;
  file_name: string;
  file_size: number;
  mime_type: string;
  status: "pending" | "processing" | "completed" | "error";
  view_url: string | null;
  download_url: string | null;
  parsed_resume: ParsedResume | null;
  created_at: string;
}

export interface ParsedResume {
  id: string;
  status: "pending" | "processing" | "completed" | "error";
  schema_version: number;
  data: ParsedResumeData;
  confidence: "high" | "medium" | "low";
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
    parsing_confidence?: "high" | "medium" | "low";
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
  applied_at: string;
  updated_at: string;
  history?: ApplicationHistoryEntry[];
  resumes?: Resume[];
}

export interface CandidateProfile {
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

export interface PipelineColumn {
  status: ApplicationStatus;
  label: string;
  count: number;
  applications: CandidateApplication[];
}

export interface PipelineBoard {
  columns: PipelineColumn[];
}
