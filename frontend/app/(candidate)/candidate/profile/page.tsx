"use client";

import { useEffect, useState } from "react";
import {
  Award,
  BriefcaseBusiness,
  FolderGit2,
  Github,
  GraduationCap,
  Linkedin,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Save,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";

import { getCandidateProfile, updateCandidateProfile } from "@/lib/candidate";
import type {
  CandidateProfile,
  ProfileExperience,
  ProfileProject,
} from "@/types/candidate";

const INPUT_CLS =
  "h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900";

function valueOrEmpty(value?: string | null) {
  return value?.toString().trim() || "Not provided";
}

function locationLabel(p: { state?: string; country?: string }) {
  const parts = [p.state, p.country].map((s) => s?.trim()).filter(Boolean);
  return parts.length ? parts.join(", ") : "Not provided";
}

type FormState = {
  first_name: string;
  last_name: string;
  phone: string;
  linkedin_url: string;
  github_url: string;
  state: string;
  country: string;
  years_of_experience: string;
  institution: string;
  cgpa: string;
  skillsText: string;
  certificationsText: string;
  projects: ProfileProject[];
  experience_entries: ProfileExperience[];
};

function toForm(p: CandidateProfile): FormState {
  return {
    first_name: p.first_name ?? "",
    last_name: p.last_name ?? "",
    phone: p.phone ?? "",
    linkedin_url: p.linkedin_url ?? "",
    github_url: p.github_url ?? "",
    state: p.state ?? "",
    country: p.country ?? "",
    years_of_experience: p.years_of_experience != null ? String(p.years_of_experience) : "",
    institution: p.institution ?? "",
    cgpa: p.cgpa ?? "",
    skillsText: (p.skills ?? []).join(", "),
    certificationsText: (p.certifications ?? []).join(", "),
    projects: (p.projects ?? []).map((x) => ({ ...x })),
    experience_entries: (p.experience_entries ?? []).map((x) => ({ ...x })),
  };
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white/60 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EB4425]/10 text-[#EB4425]">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</p>
        <p className="mt-1 break-words text-sm font-medium text-neutral-900">{value}</p>
      </div>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-panel rounded-lg p-6">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-[#EB4425]" aria-hidden="true" />
        <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function CandidateProfilePage() {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let ignore = false;
    getCandidateProfile()
      .then((data) => {
        if (!ignore) {
          setProfile(data);
          setError("");
        }
      })
      .catch(() => {
        if (!ignore) setError("Could not load your profile.");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  function startEdit() {
    if (profile) {
      setForm(toForm(profile));
      setEditing(true);
    }
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  function updateProject(i: number, key: keyof ProfileProject, value: string) {
    setForm((f) =>
      f
        ? { ...f, projects: f.projects.map((p, idx) => (idx === i ? { ...p, [key]: value } : p)) }
        : f,
    );
  }

  function updateExperience(i: number, key: keyof ProfileExperience, value: string) {
    setForm((f) =>
      f
        ? {
            ...f,
            experience_entries: f.experience_entries.map((e, idx) =>
              idx === i ? { ...e, [key]: value } : e,
            ),
          }
        : f,
    );
  }

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    try {
      const payload: Partial<CandidateProfile> = {
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        linkedin_url: form.linkedin_url,
        github_url: form.github_url,
        state: form.state,
        country: form.country,
        years_of_experience: form.years_of_experience.trim() === "" ? null : form.years_of_experience.trim(),
        institution: form.institution,
        cgpa: form.cgpa,
        skills: form.skillsText.split(",").map((s) => s.trim()).filter(Boolean),
        certifications: form.certificationsText.split(",").map((s) => s.trim()).filter(Boolean),
        projects: form.projects.filter((p) => p.name.trim() || p.description.trim()),
        experience_entries: form.experience_entries.filter(
          (e) => e.role.trim() || e.company.trim() || e.description.trim(),
        ),
      };
      const updated = await updateCandidateProfile(payload);
      setProfile(updated);
      setEditing(false);
      setForm(null);
    } catch (err: any) {
      alert(err?.data?.detail || "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="glass-panel rounded-lg p-8 text-center text-sm text-neutral-500">
        Loading your profile...
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="rounded-lg border border-danger-600/30 bg-danger-50 p-6 text-sm font-medium text-danger-600">
        {error || "Profile is unavailable."}
      </div>
    );
  }

  const fullName = `${profile.first_name} ${profile.last_name}`.trim() || profile.email;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-lg p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-xl font-bold text-primary-700">
              {fullName[0]?.toUpperCase() || "C"}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{fullName}</h1>
              <p className="mt-1 text-sm text-neutral-500">{profile.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 rounded-xl bg-white/60 px-4 py-3">
              <BriefcaseBusiness className="h-5 w-5 text-[#EB4425]" aria-hidden="true" />
              <div>
                <p className="text-xl font-bold text-neutral-900">{profile.application_count}</p>
                <p className="text-xs font-medium text-neutral-500">Applications</p>
              </div>
            </div>
            {!editing && (
              <button
                type="button"
                onClick={startEdit}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-[#EB4425] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(235,68,37,0.5)] transition-all hover:bg-[#D93719]"
              >
                <Pencil className="h-4 w-4" />
                Edit profile
              </button>
            )}
          </div>
        </div>
      </div>

      {editing && form ? (
        /* ---------- EDIT MODE ---------- */
        <div className="space-y-6">
          <SectionCard icon={User} title="Basic details">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">First name</span>
                <input className={`mt-1.5 ${INPUT_CLS}`} value={form.first_name} onChange={(e) => updateField("first_name", e.target.value)} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Last name</span>
                <input className={`mt-1.5 ${INPUT_CLS}`} value={form.last_name} onChange={(e) => updateField("last_name", e.target.value)} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Phone</span>
                <input className={`mt-1.5 ${INPUT_CLS}`} value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Years of experience</span>
                <input className={`mt-1.5 ${INPUT_CLS}`} inputMode="decimal" placeholder="e.g. 3" value={form.years_of_experience} onChange={(e) => updateField("years_of_experience", e.target.value)} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">State</span>
                <input className={`mt-1.5 ${INPUT_CLS}`} placeholder="e.g. Kerala" value={form.state} onChange={(e) => updateField("state", e.target.value)} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Country</span>
                <input className={`mt-1.5 ${INPUT_CLS}`} placeholder="e.g. India" value={form.country} onChange={(e) => updateField("country", e.target.value)} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Institution</span>
                <input className={`mt-1.5 ${INPUT_CLS}`} value={form.institution} onChange={(e) => updateField("institution", e.target.value)} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">CGPA</span>
                <input className={`mt-1.5 ${INPUT_CLS}`} placeholder="e.g. 8.5/10" value={form.cgpa} onChange={(e) => updateField("cgpa", e.target.value)} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">LinkedIn URL</span>
                <input className={`mt-1.5 ${INPUT_CLS}`} value={form.linkedin_url} onChange={(e) => updateField("linkedin_url", e.target.value)} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">GitHub URL</span>
                <input className={`mt-1.5 ${INPUT_CLS}`} value={form.github_url} onChange={(e) => updateField("github_url", e.target.value)} />
              </label>
            </div>
          </SectionCard>

          <SectionCard icon={Sparkles} title="Skills">
            <label className="block">
              <span className="text-xs text-neutral-500">Comma-separated (e.g. React, Python, SQL)</span>
              <input className={`mt-1.5 ${INPUT_CLS}`} value={form.skillsText} onChange={(e) => updateField("skillsText", e.target.value)} />
            </label>
          </SectionCard>

          <SectionCard icon={Award} title="Certifications">
            <label className="block">
              <span className="text-xs text-neutral-500">Comma-separated (e.g. AWS SAA, Google UX)</span>
              <input className={`mt-1.5 ${INPUT_CLS}`} value={form.certificationsText} onChange={(e) => updateField("certificationsText", e.target.value)} />
            </label>
          </SectionCard>

          <SectionCard icon={FolderGit2} title="Projects">
            <div className="space-y-3">
              {form.projects.map((p, i) => (
                <div key={i} className="space-y-2 rounded-xl border border-neutral-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Project {i + 1}</span>
                    <button type="button" onClick={() => updateField("projects", form.projects.filter((_, idx) => idx !== i))} className="text-neutral-400 hover:text-danger-600" aria-label="Remove project">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <input className={INPUT_CLS} placeholder="Project name" value={p.name} onChange={(e) => updateProject(i, "name", e.target.value)} />
                  <textarea className={`${INPUT_CLS} h-auto py-2.5`} rows={2} placeholder="Short description" value={p.description} onChange={(e) => updateProject(i, "description", e.target.value)} />
                </div>
              ))}
              <button type="button" onClick={() => updateField("projects", [...form.projects, { name: "", description: "" }])} className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:border-neutral-900">
                <Plus className="h-4 w-4" /> Add project
              </button>
            </div>
          </SectionCard>

          <SectionCard icon={BriefcaseBusiness} title="Experience">
            <div className="space-y-3">
              {form.experience_entries.map((ex, i) => (
                <div key={i} className="space-y-2 rounded-xl border border-neutral-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Role {i + 1}</span>
                    <button type="button" onClick={() => updateField("experience_entries", form.experience_entries.filter((_, idx) => idx !== i))} className="text-neutral-400 hover:text-danger-600" aria-label="Remove experience">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input className={INPUT_CLS} placeholder="Role / title" value={ex.role} onChange={(e) => updateExperience(i, "role", e.target.value)} />
                    <input className={INPUT_CLS} placeholder="Company" value={ex.company} onChange={(e) => updateExperience(i, "company", e.target.value)} />
                  </div>
                  <textarea className={`${INPUT_CLS} h-auto py-2.5`} rows={2} placeholder="What you did" value={ex.description} onChange={(e) => updateExperience(i, "description", e.target.value)} />
                </div>
              ))}
              <button type="button" onClick={() => updateField("experience_entries", [...form.experience_entries, { role: "", company: "", description: "" }])} className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:border-neutral-900">
                <Plus className="h-4 w-4" /> Add experience
              </button>
            </div>
          </SectionCard>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => { setEditing(false); setForm(null); }} className="inline-flex h-11 items-center gap-2 rounded-full border border-neutral-300 bg-white px-6 text-sm font-semibold text-neutral-700 transition-colors hover:border-neutral-900">
              <X className="h-4 w-4" /> Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#EB4425] px-6 text-sm font-bold text-white shadow-[0_12px_28px_-8px_rgba(235,68,37,0.5)] transition-all hover:bg-[#D93719] disabled:opacity-60">
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save profile"}
            </button>
          </div>
        </div>
      ) : (
        /* ---------- VIEW MODE ---------- */
        <div className="space-y-6">
          <SectionCard icon={User} title="Profile details">
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow icon={User} label="Name" value={fullName} />
              <InfoRow icon={Mail} label="Email" value={profile.email} />
              <InfoRow icon={Phone} label="Phone" value={valueOrEmpty(profile.phone)} />
              <InfoRow icon={MapPin} label="Location" value={locationLabel(profile)} />
              <InfoRow
                icon={BriefcaseBusiness}
                label="Years of experience"
                value={profile.years_of_experience != null && String(profile.years_of_experience).trim() !== "" ? `${profile.years_of_experience} yrs` : "Not provided"}
              />
              <InfoRow icon={GraduationCap} label="Institution" value={valueOrEmpty(profile.institution)} />
              <InfoRow icon={GraduationCap} label="CGPA" value={valueOrEmpty(profile.cgpa)} />
              <InfoRow icon={Linkedin} label="LinkedIn" value={valueOrEmpty(profile.linkedin_url)} />
              <InfoRow icon={Github} label="GitHub" value={valueOrEmpty(profile.github_url)} />
            </div>
          </SectionCard>

          <SectionCard icon={Sparkles} title="Skills">
            {profile.skills?.length ? (
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((s) => (
                  <span key={s} className="rounded-full bg-[#EB4425]/10 px-3 py-1 text-sm font-medium text-[#EB4425]">
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">No skills added yet.</p>
            )}
          </SectionCard>

          <SectionCard icon={BriefcaseBusiness} title="Experience">
            {profile.experience_entries?.length ? (
              <div className="space-y-4">
                {profile.experience_entries.map((ex, i) => (
                  <div key={i} className="border-l-2 border-[#EB4425]/30 pl-4">
                    <p className="text-sm font-semibold text-neutral-900">
                      {ex.role || "Role"}
                      {ex.company ? ` · ${ex.company}` : ""}
                    </p>
                    {ex.description && <p className="mt-1 text-sm text-neutral-600">{ex.description}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">No experience added yet.</p>
            )}
          </SectionCard>

          <SectionCard icon={FolderGit2} title="Projects">
            {profile.projects?.length ? (
              <div className="space-y-4">
                {profile.projects.map((p, i) => (
                  <div key={i} className="rounded-xl border border-neutral-200 bg-white/60 p-4">
                    <p className="text-sm font-semibold text-neutral-900">{p.name || "Project"}</p>
                    {p.description && <p className="mt-1 text-sm text-neutral-600">{p.description}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">No projects added yet.</p>
            )}
          </SectionCard>

          <SectionCard icon={Award} title="Certifications">
            {profile.certifications?.length ? (
              <div className="flex flex-wrap gap-2">
                {profile.certifications.map((c) => (
                  <span key={c} className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-medium text-neutral-700">
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">No certifications added yet.</p>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}
