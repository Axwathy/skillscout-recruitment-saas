import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Radar } from "lucide-react";

import { MarketingFooter } from "@/components/MarketingFooter";

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold tracking-tight text-neutral-900">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-neutral-600">{children}</div>
    </section>
  );
}

export function LegalShell({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-neutral-200/70 bg-white/70 backdrop-blur-glass">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EB4425] text-white shadow-[0_8px_20px_-6px_rgba(235,68,37,0.6)]">
              <Radar className="h-4 w-4" />
            </span>
            <span className="text-lg font-bold tracking-tight text-neutral-900">SkillScout</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-label text-[#EB4425]">Legal</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-neutral-900">{title}</h1>
        <p className="mt-2 text-sm text-neutral-500">Last updated {updated}</p>
        <p className="mt-6 text-base leading-relaxed text-neutral-600">{intro}</p>

        <div className="mt-10 space-y-8">{children}</div>

        <div className="mt-12 rounded-2xl border border-neutral-200 bg-white/60 p-5 text-sm text-neutral-500">
          This document is a template provided with the SkillScout platform. Review it with your
          legal counsel and tailor it to your jurisdiction before going live.
        </div>
      </article>

      <MarketingFooter />
    </main>
  );
}
