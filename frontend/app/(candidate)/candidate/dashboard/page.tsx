"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  FileText,
  Hourglass,
  MoreHorizontal,
  Sparkles,
  Trash2,
  Trophy,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import {
  getCandidateApplications,
  getCandidateRecommendations,
  withdrawCandidateApplication,
} from "@/lib/candidate";
import { MatchRing } from "@/components/ui/MatchRing";
import type { CandidateApplication, JobRecommendation } from "@/types/candidate";
import type { ApplicationStatus } from "@/types/jobs";

const STATUS_COLOR: Record<ApplicationStatus, string> = {
  applied: "bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-600/20",
  under_review: "bg-warning-50 text-warning-600 ring-1 ring-inset ring-warning-600/20",
  shortlisted: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20",
  technical_round: "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20",
  hr_round: "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20",
  offer: "bg-success-50 text-success-600 ring-1 ring-inset ring-success-600/20",
  rejected: "bg-neutral-100 text-neutral-600 ring-1 ring-inset ring-neutral-500/20",
  hired: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
};

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

function formatDate(v: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(v),
  );
}

function metaLine(rec: JobRecommendation) {
  return [rec.salary_range, rec.location].map((s) => s?.trim()).filter(Boolean).join(" · ");
}

/** Faint accent orbit decoration for the hero card. */
function HeroOrbit() {
  return (
    <svg
      className="pointer-events-none absolute -right-6 top-1/2 hidden h-48 w-48 -translate-y-1/2 text-[#EB4425] sm:block"
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeOpacity="0.12">
        <ellipse cx="100" cy="100" rx="80" ry="40" transform="rotate(-25 100 100)" />
        <ellipse cx="100" cy="100" rx="60" ry="60" />
        <ellipse cx="100" cy="100" rx="40" ry="78" transform="rotate(20 100 100)" />
      </g>
      <circle cx="100" cy="100" r="10" fill="currentColor" fillOpacity="0.12" />
      <circle cx="172" cy="118" r="4" fill="currentColor" fillOpacity="0.3" />
      <circle cx="40" cy="64" r="3" fill="currentColor" fillOpacity="0.3" />
    </svg>
  );
}

export default function CandidateDashboardPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<CandidateApplication[]>([]);
  const [recommendations, setRecommendations] = useState<JobRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      getCandidateApplications().catch(() => [] as CandidateApplication[]),
      getCandidateRecommendations().catch(() => [] as JobRecommendation[]),
    ])
      .then(([apps, recs]) => {
        if (!ignore) {
          setApplications(apps);
          setRecommendations(recs);
        }
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  async function handleWithdraw(app: CandidateApplication) {
    const confirmed = window.confirm(
      `Delete your application to ${app.job_title} at ${app.organization_name}? This cannot be undone.`,
    );
    if (!confirmed) return;
    try {
      await withdrawCandidateApplication(app.id);
      setApplications((current) => current.filter((item) => item.id !== app.id));
    } catch {
      /* ignore */
    }
  }

  const active = applications.filter(
    (a) => !["rejected", "hired", "archived"].includes(a.status),
  ).length;
  const offers = applications.filter((a) => a.status === "offer").length;

  const matchCount = recommendations.filter((r) => (r.match_score ?? 0) >= 70).length;
  const heroSubtext =
    recommendations.length > 0
      ? `Your skill profile has been analyzed. You have strong matches with ${
          matchCount || recommendations.length
        } open ${(matchCount || recommendations.length) === 1 ? "role" : "roles"} right now.`
      : "Your skill profile is ready. Browse open roles to find your perfect match.";

  const stats = [
    { icon: FileText, label: "Total", value: applications.length, sub: "Applications" },
    { icon: Hourglass, label: "Active", value: active, sub: "In progress" },
    { icon: Trophy, label: "Offers", value: offers, sub: "Received" },
  ];

  return (
    <div className="animate-fade-in grid gap-6 lg:grid-cols-3">
      {/* Left column */}
      <div className="space-y-6 lg:col-span-2">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-[20px] border border-neutral-200/70 bg-white p-6 shadow-glass sm:p-8">
          <HeroOrbit />
          <div className="relative max-w-lg">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EB4425]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#EB4425]">
              <Sparkles className="h-3 w-3" /> AI-Powered Insights
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-neutral-900">
              Welcome back,{" "}
              <span className="text-[#EB4425]">{user?.first_name || "there"}</span>
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">{heroSubtext}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-[20px] border border-neutral-200/70 bg-white p-5 shadow-glass">
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EB4425]/10 text-[#EB4425]">
                  <s.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                  {s.label}
                </span>
              </div>
              <p className="mt-3 text-3xl font-bold tracking-tight text-neutral-900">
                {isLoading ? "—" : s.value}
              </p>
              <p className="text-sm font-medium text-neutral-500">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Recent applications */}
        <section className="rounded-[20px] border border-neutral-200/70 bg-white shadow-glass">
          <div className="flex items-center justify-between px-6 py-5">
            <h2 className="text-base font-semibold text-neutral-900">Recent Applications</h2>
            <Link
              href="/candidate/applications"
              className="text-neutral-400 transition-colors hover:text-neutral-700"
              aria-label="View all applications"
            >
              <MoreHorizontal className="h-5 w-5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="px-6 py-12 text-center text-sm text-neutral-400">Loading…</div>
          ) : applications.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-neutral-300 text-neutral-300">
                <FileText className="h-7 w-7" />
              </div>
              <p className="text-base font-semibold text-neutral-900">No applications yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">
                You haven&apos;t applied to any positions recently. Let our AI find the perfect match
                for your skills.
              </p>
              <Link
                href="/jobs"
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-900 transition-colors hover:border-neutral-900"
              >
                Browse open positions
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-200/70 border-t border-neutral-200/70">
              {applications.slice(0, 5).map((app) => (
                <li key={app.id} className="flex items-center gap-2 pr-4">
                  <Link
                    href={`/candidate/applications/${app.id}`}
                    className="group flex flex-1 items-center justify-between gap-4 py-4 pl-6 transition-colors hover:bg-neutral-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-neutral-900 transition-colors group-hover:text-[#EB4425]">
                        {app.job_title}
                      </p>
                      <p className="mt-0.5 text-sm text-neutral-500">{app.organization_name}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[app.status]}`}
                      >
                        {app.status === "hired" && <Trophy className="mr-1.5 h-3 w-3" />}
                        {STATUS_LABEL[app.status]}
                      </span>
                      <span className="text-xs font-medium text-neutral-400">
                        Applied {formatDate(app.applied_at)}
                      </span>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleWithdraw(app)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-danger-600/30 text-danger-600 transition-colors hover:bg-danger-50"
                    title="Delete application"
                    aria-label={`Delete application to ${app.job_title}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Right column — recommendations */}
      <aside className="rounded-[20px] border border-neutral-200/70 bg-white p-5 shadow-glass lg:col-span-1">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-900">Recommended for you</h2>
          <Link href="/jobs" className="text-sm font-semibold text-[#EB4425] hover:text-[#B51D00]">
            See all
          </Link>
        </div>

        {isLoading ? (
          <p className="py-12 text-center text-sm text-neutral-400">Finding your matches…</p>
        ) : recommendations.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-semibold text-neutral-900">No open roles right now</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-neutral-500">
              Check back soon — new roles are posted regularly.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {recommendations.map((rec) => (
              <div key={rec.id} className="rounded-2xl border border-neutral-200/70 bg-white p-4 transition-shadow hover:shadow-glass">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EB4425]/10 text-sm font-bold text-[#EB4425]">
                      {rec.organization_name?.[0]?.toUpperCase() ?? "?"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-neutral-900">{rec.title}</p>
                      <p className="truncate text-xs text-neutral-500">{rec.organization_name}</p>
                    </div>
                  </div>
                  {rec.match_score != null && (
                    <div className="flex shrink-0 flex-col items-center">
                      <MatchRing value={rec.match_score} size={42} strokeWidth={4} />
                      <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-neutral-400">
                        Match
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-xs text-neutral-500">
                    {metaLine(rec) || "—"}
                  </p>
                  <Link
                    href={`/jobs/${rec.slug}`}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#EB4425] px-3 py-1.5 text-xs font-bold text-white shadow-[0_8px_18px_-8px_rgba(235,68,37,0.5)] transition-all hover:bg-[#D93719]"
                  >
                    Quick Apply
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
