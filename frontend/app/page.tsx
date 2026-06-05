import type { Metadata } from "next";
import Link from "next/link";
import { Brain, Target, LayoutDashboard, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "RecruitAI — AI-Powered Recruitment",
  description: "RecruitAI is an enterprise AI recruitment platform. Math ranks. AI explains. You decide.",
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-neutral-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white">
              <Zap className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold text-neutral-900 tracking-tight">
              RecruitAI
            </span>
          </Link>
          <nav className="flex items-center gap-4" aria-label="Main navigation">
            <Link
              href="/jobs"
              className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              Careers
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
              id="nav-login"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
              id="nav-register"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary-400 opacity-20 blur-[100px]"></div>
        
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 text-center sm:py-32">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-primary-50/50 px-3 py-1 text-xs font-semibold text-primary-600 mb-8 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-primary-600 animate-pulse"></span>
            Enterprise Recruitment Intelligence
          </div>
          <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight text-neutral-900 sm:text-7xl">
            Hire with clarity. <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-600">
              AI-assisted.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-neutral-600">
            RecruitAI brings deterministic scoring and AI explanations together in
            one enterprise recruitment workspace. Math ranks. AI explains. You decide.
          </p>

        </div>
      </section>

      {/* Feature pillars */}
      <section className="bg-neutral-50 py-24 sm:py-32" aria-labelledby="features-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2
              id="features-heading"
              className="text-base font-semibold text-primary-600 tracking-wide uppercase"
            >
              Platform Capabilities
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              Built for modern enterprise teams
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {[
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
            ].map((feature) => (
              <div
                key={feature.id}
                id={feature.id}
                className="group relative rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-neutral-200/50 hover:border-primary-200"
              >
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-600 group-hover:text-white">
                  <feature.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-neutral-900">
                  {feature.title}
                </h3>
                <p className="text-base leading-relaxed text-neutral-600">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative isolate overflow-hidden bg-neutral-900 py-24 sm:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"></div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to transform your hiring?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-neutral-300">
            Join innovative companies using RecruitAI to make faster, fairer, and more confident hiring decisions.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/register"
              className="rounded-lg bg-primary-500 px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-primary-400 hover:scale-105 active:scale-95"
            >
              Get started today
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between">
          <div className="flex items-center gap-2 mb-4 sm:mb-0">
            <Zap className="h-5 w-5 text-neutral-400" />
            <span className="text-sm font-semibold text-neutral-900">
              RecruitAI
            </span>
          </div>
          <p className="text-sm text-neutral-500">
            © {new Date().getFullYear()} RecruitAI, Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
