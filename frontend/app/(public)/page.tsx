import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Brain,
  Check,
  GitBranch,
  LayoutDashboard,
  ListChecks,
  MessageSquareText,
  Radar,
  Search,
  ShieldCheck,
  Target,
} from "lucide-react";

import { MarketingFooter } from "@/components/MarketingFooter";

export const metadata: Metadata = {
  title: "SkillScout — AI-Powered Recruitment",
  description:
    "SkillScout is an enterprise AI recruitment platform. Math ranks. AI explains. You decide.",
};

const PILLARS = [
  {
    id: "pillar-scoring",
    icon: Target,
    title: "Deterministic Scoring",
    body: "Every candidate ranked by transparent, auditable criteria — no black boxes or hidden biases.",
  },
  {
    id: "pillar-ai",
    icon: Brain,
    title: "AI Explanations",
    body: "AI explains score drivers in plain language without changing the underlying mathematical ranking logic.",
  },
  {
    id: "pillar-pipeline",
    icon: LayoutDashboard,
    title: "Unified Pipeline",
    body: "From sourcing to offer, a single collaborative workspace for your entire recruiting and hiring team.",
  },
];

const PRINCIPLES = [
  { k: "100%", v: "Auditable scoring" },
  { k: "3", v: "Match signals" },
  { k: "0", v: "Black boxes" },
  { k: "1", v: "Unified workspace" },
];

const CAPABILITIES = [
  { icon: Search, title: "Semantic talent search" },
  { icon: GitBranch, title: "Drag-and-drop pipeline" },
  { icon: MessageSquareText, title: "AI interview prep" },
  { icon: ListChecks, title: "Bulk screening" },
  { icon: BarChart3, title: "Hiring insights" },
  { icon: ShieldCheck, title: "Enterprise-grade security" },
];

const STEPS = [
  {
    n: "01",
    title: "Post a role",
    body: "Publish a job in minutes. Applications flow straight into your pipeline — no spreadsheets.",
  },
  {
    n: "02",
    title: "AI ranks every candidate",
    body: "Each applicant is scored on skills, semantic fit, and experience, with a breakdown you can audit.",
  },
  {
    n: "03",
    title: "You decide & hire",
    body: "Move candidates through stages, collaborate with your team, and make the call with confidence.",
  },
];

/** Signature element — an animated radar that scans for talent (ties to the SkillScout mark). */
function RadarVisual() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[440px]">
      <div className="absolute -inset-6 rounded-full bg-[#EB4425]/10 blur-3xl" />
      {/* rings */}
      <div className="absolute inset-0 rounded-full border border-neutral-200" />
      <div className="absolute inset-[13%] rounded-full border border-neutral-200/90" />
      <div className="absolute inset-[28%] rounded-full border border-neutral-200/80" />
      <div className="absolute inset-[44%] rounded-full border border-neutral-200/70" />
      {/* crosshair */}
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-neutral-200/70" />
      <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-neutral-200/70" />
      {/* sweep */}
      <div
        className="absolute inset-0 rounded-full animate-radar-spin"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(235,68,37,0.35), rgba(235,68,37,0.05) 38%, transparent 52%)",
        }}
      />
      {/* center */}
      <div className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#EB4425] shadow-[0_0_0_7px_rgba(235,68,37,0.15)]" />
      {/* blips */}
      <span className="absolute left-[67%] top-[33%] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#EB4425] animate-signal-pulse" />
      <span
        className="absolute left-[39%] top-[63%] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#EB4425] animate-signal-pulse"
        style={{ animationDelay: "0.9s" }}
      />
      <span className="absolute left-[58%] top-[58%] h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-400" />
      {/* instrument readouts (the editorial × mission-control detail) */}
      <span className="absolute left-[70%] top-[26%] rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#EB4425] shadow-sm">
        94% match
      </span>
      <span className="absolute left-[16%] top-[70%] rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 shadow-sm">
        scanning…
      </span>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-neutral-200/70 bg-white/70 backdrop-blur-glass">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EB4425] text-white shadow-[0_8px_20px_-6px_rgba(235,68,37,0.6)]">
              <Radar className="h-4 w-4" />
            </span>
            <span className="text-lg font-bold tracking-tight text-neutral-900">SkillScout</span>
          </Link>
          <nav className="flex items-center gap-3" aria-label="Main navigation">
            <Link
              href="/login"
              id="nav-login"
              className="hidden text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900 sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              id="nav-register"
              className="rounded-full bg-[#EB4425] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(235,68,37,0.5)] transition-all duration-200 hover:bg-[#D93719]"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero — text left, radar right */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1c1c08_1px,transparent_1px),linear-gradient(to_bottom,#1a1c1c08_1px,transparent_1px)] bg-[size:28px_28px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:py-28 lg:px-8">
          <div className="animate-rise-in">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-100 bg-primary-50/60 px-3 py-1 text-xs font-semibold text-primary-700 backdrop-blur-sm">
              <span className="flex h-2 w-2 rounded-full bg-[#EB4425] animate-signal-pulse" />
              Enterprise Recruitment Intelligence
            </div>
            <h1 className="text-5xl font-extrabold tracking-tightest text-neutral-900 sm:text-6xl lg:text-7xl">
              Hire with clarity.
              <br />
              <span className="bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
                AI-assisted.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-600">
              SkillScout scans every applicant and ranks them with transparent, auditable scoring —
              then explains the &ldquo;why&rdquo; in plain language.{" "}
              <span className="font-semibold text-neutral-900">
                Math ranks. AI explains. You decide.
              </span>
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-[#EB4425] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_12px_28px_-8px_rgba(235,68,37,0.5)] transition-all duration-200 hover:bg-[#D93719]"
              >
                Get started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-neutral-300 bg-white/70 px-7 py-3.5 text-sm font-semibold text-neutral-900 transition-colors hover:border-neutral-900"
              >
                Sign in
              </Link>
            </div>
            <p className="mt-6 text-xs font-medium uppercase tracking-label text-neutral-400">
              No setup fees · Cancel anytime · Built for enterprise teams
            </p>
          </div>

          <div className="animate-rise-in [animation-delay:120ms]">
            <RadarVisual />
          </div>
        </div>
      </section>

      {/* Principle band */}
      <section className="border-y border-neutral-200/70 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
          {PRINCIPLES.map((p) => (
            <div key={p.v} className="px-2 py-8 text-center">
              <p className="text-3xl font-bold tracking-tight text-[#EB4425] sm:text-4xl">{p.k}</p>
              <p className="mt-1 text-sm font-medium text-neutral-500">{p.v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature pillars */}
      <section className="py-24 sm:py-28" aria-labelledby="features-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <h2
              id="features-heading"
              className="text-sm font-semibold uppercase tracking-label text-primary-600"
            >
              Platform Capabilities
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              Built for modern enterprise teams
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {PILLARS.map((feature) => (
              <div
                key={feature.id}
                id={feature.id}
                className="group glass-panel relative rounded-lg p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-glass-lg"
              >
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-colors group-hover:bg-[#EB4425] group-hover:text-white">
                  <feature.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-neutral-900">{feature.title}</h3>
                <p className="text-base leading-relaxed text-neutral-600">{feature.body}</p>
              </div>
            ))}
          </div>

          {/* Capabilities grid */}
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((c) => (
              <div
                key={c.title}
                className="flex items-center gap-3 rounded-2xl border border-neutral-200/70 bg-white px-4 py-3.5 transition-colors hover:border-[#EB4425]/40"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EB4425]/10 text-[#EB4425]">
                  <c.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold text-neutral-800">{c.title}</span>
                <Check className="ml-auto h-4 w-4 text-[#EB4425]" aria-hidden="true" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — 01 / 02 / 03 */}
      <section className="border-t border-neutral-200/70 bg-white py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 max-w-2xl">
            <h2 className="text-sm font-semibold uppercase tracking-label text-primary-600">
              How it works
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              From open role to confident hire
            </p>
          </div>
          <div className="grid gap-10 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n} className="relative">
                <span className="text-5xl font-extrabold tracking-tighter text-[#EB4425]/20">
                  {step.n}
                </span>
                <h3 className="mt-3 text-lg font-bold text-neutral-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative isolate overflow-hidden bg-neutral-900 py-24 sm:py-28">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(235,68,37,0.25),rgba(255,255,255,0))]" />
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to transform your hiring?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-neutral-300">
            Join teams using SkillScout to make faster, fairer, and more confident hiring decisions.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-[#EB4425] px-8 py-3.5 text-sm font-semibold text-white shadow-[0_12px_28px_-8px_rgba(235,68,37,0.5)] transition-all duration-200 hover:bg-[#D93719]"
            >
              Get started today
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-white/25 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
