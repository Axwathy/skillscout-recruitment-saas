"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Briefcase,
  Check,
  ChevronDown,
  FileText,
  Filter,
  Sparkles,
  Tag,
  Users,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { getApplications } from "@/lib/applications";
import { getJobs } from "@/lib/jobs";
import { MatchRing, matchStrength } from "@/components/ui/MatchRing";
import { RadialGrowthChart } from "@/components/ui/RadialGrowthChart";
import type { Application, ApplicationStatus } from "@/types/jobs";

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: "Applied",
  under_review: "Under Review",
  shortlisted: "Shortlisted",
  technical_round: "Technical Round",
  hr_round: "HR Round",
  offer: "Offer",
  rejected: "Rejected",
  hired: "Hired",
};

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function scoreNumber(value: Application["final_score"]): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [openJobs, setOpenJobs] = useState<number | null>(null);
  const [draftJobs, setDraftJobs] = useState<number | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const [published, draft, apps] = await Promise.all([
          getJobs({ status: "published" }),
          getJobs({ status: "draft" }),
          getApplications(),
        ]);
        if (!ignore) {
          setOpenJobs(published.length);
          setDraftJobs(draft.length);
          setApplications(apps);
        }
      } catch {
        // non-critical
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  if (!user) return null;

  const newApplications = applications.filter((a) => a.status === "applied").length;

  // Top matches by real AI score
  const topMatches = [...applications]
    .map((a) => ({ app: a, score: scoreNumber(a.final_score) }))
    .filter((x): x is { app: Application; score: number } => x.score !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const statRows = [
    { icon: Briefcase, label: "Open jobs", value: openJobs ?? "—", href: "/dashboard/jobs?status=published" },
    { icon: FileText, label: "Applications", value: applications.length, href: "/dashboard/applications" },
    { icon: Users, label: "New this week", value: newApplications, href: "/dashboard/applications" },
  ];

  const accordionRows = [
    { key: "drafts", label: "Draft jobs", value: String(draftJobs ?? "—") },
    { key: "matches", label: "Scored candidates", value: String(topMatches.length) },
  ];

  return (
    <div className="space-y-8">
      {/* Hero + floating stat card */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Hero + chart */}
        <div className="space-y-6 lg:col-span-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EB4425]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#EB4425]">
              <Sparkles className="h-3 w-3" /> AI · Powered
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
              Your talent match
            </h1>
            <p className="mt-3 max-w-xl text-base text-neutral-500">
              SkillScout has analyzed your pipeline and surfaced the strongest candidate matches
              across your open roles.
            </p>
          </div>

          <div className="h-[300px]">
            <RadialGrowthChart
              axisStart="Applications"
              axisEnd="Hires"
              caption="Recruitment growth"
              cornerLabel="This year"
            />
          </div>
        </div>

        {/* Floating stat card */}
        <div className="h-fit rounded-[20px] border border-neutral-200/70 bg-white p-5 shadow-glass">
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
            Talent recruitment
          </h2>
          <div className="mt-4 space-y-1">
            {statRows.map((row) => (
              <Link
                key={row.label}
                href={row.href}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-neutral-50"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EB4425]/10 text-[#EB4425]">
                    <row.icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium text-neutral-700">{row.label}</span>
                </span>
                <span className="text-sm font-bold tabular-nums text-neutral-900">
                  {loading ? "—" : row.value}
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-3 border-t border-neutral-100 pt-3">
            {accordionRows.map((row) => (
              <div key={row.key}>
                <button
                  onClick={() => setExpanded((c) => (c === row.key ? null : row.key))}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-neutral-50"
                >
                  <span className="text-sm font-medium text-neutral-700">{row.label}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-neutral-400 transition-transform ${
                      expanded === row.key ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {expanded === row.key && (
                  <p className="animate-fade-in px-3 pb-2.5 text-2xl font-bold text-neutral-900">
                    {row.value}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter chips + quick link */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
            <Filter className="h-4 w-4" />
          </span>
          <Link
            href="/dashboard/jobs?status=published"
            className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-200"
          >
            <Tag className="h-3.5 w-3.5" /> Open roles
          </Link>
          <Link
            href="/dashboard/applications"
            className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-200"
          >
            New applications
          </Link>
          <Link
            href="/dashboard/pipeline"
            className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-200"
          >
            Pipeline
          </Link>
        </div>
        <Link
          href="/dashboard/candidates"
          className="text-sm font-semibold text-[#EB4425] hover:text-[#B51D00]"
        >
          View all candidates →
        </Link>
      </div>

      {/* Match result cards */}
      {topMatches.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {topMatches.map(({ app, score }) => {
            const strength = matchStrength(score);
            return (
              <Link
                key={app.id}
                href={`/dashboard/applications/${app.id}`}
                className="group rounded-[20px] border border-neutral-200/70 bg-white p-5 shadow-glass transition-all hover:-translate-y-1 hover:shadow-glass-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-neutral-900">
                      {app.candidate.first_name} {app.candidate.last_name}
                    </p>
                    <p className="truncate text-sm text-neutral-500">
                      {app.job_title} · {timeAgo(app.applied_at)}
                    </p>
                  </div>
                  <ArrowUpRight className="h-5 w-5 shrink-0 text-neutral-300 transition-colors group-hover:text-[#EB4425]" />
                </div>

                <div className="mt-5 flex items-center gap-4">
                  <MatchRing value={score} size={72} />
                  <div>
                    <p
                      className={`text-sm font-bold uppercase tracking-wide ${
                        strength.tone === "success"
                          ? "text-[#EB4425]"
                          : "text-neutral-400"
                      }`}
                    >
                      {strength.label}
                    </p>
                    <p className="text-xs text-neutral-500">{STATUS_LABEL[app.status]}</p>
                  </div>
                </div>

                <div className="mt-5 space-y-1.5 border-t border-neutral-100 pt-4">
                  {[
                    { label: "AI scored", ok: true },
                    { label: "Resume on file", ok: Boolean(app.resumes?.length) },
                    { label: "In pipeline", ok: app.status !== "applied" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-sm">
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-full ${
                          item.ok ? "bg-[#EB4425]/10 text-[#EB4425]" : "bg-neutral-100 text-neutral-300"
                        }`}
                      >
                        <Check className="h-3 w-3" />
                      </span>
                      <span className={item.ok ? "text-neutral-700" : "text-neutral-400"}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[20px] border border-dashed border-neutral-300 bg-white/50 px-6 py-16 text-center">
          <p className="text-base font-semibold text-neutral-900">No scored candidates yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">
            Post a job and add applications — SkillScout will rank candidates and surface the
            strongest matches here.
          </p>
          <Link
            href="/dashboard/jobs/new"
            className="mt-6 inline-flex items-center rounded-full bg-[#EB4425] px-6 py-3 text-sm font-bold text-white shadow-[0_12px_28px_-8px_rgba(235,68,37,0.5)] transition-all hover:bg-[#D93719]"
          >
            Post a new job
          </Link>
        </div>
      )}
    </div>
  );
}
