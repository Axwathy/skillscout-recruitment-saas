import Link from "next/link";
import { Radar } from "lucide-react";

import { CookieSettings } from "@/components/CookieSettings";

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-400">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="text-sm text-neutral-600 transition-colors hover:text-[#EB4425]">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EB4425] text-white shadow-[0_8px_20px_-6px_rgba(235,68,37,0.6)]">
                <Radar className="h-4 w-4" />
              </span>
              <span className="text-lg font-bold tracking-tight text-neutral-900">SkillScout</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-neutral-500">
              Math ranks. AI explains. You decide.
            </p>
          </div>

          <FooterCol
            title="Product"
            links={[
              { label: "Sign in", href: "/login" },
              { label: "Get started", href: "/register" },
              { label: "Browse open roles", href: "/jobs" },
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              { label: "Security", href: "/security" },
              { label: "Privacy policy", href: "/privacy" },
              { label: "Terms of service", href: "/terms" },
            ]}
          />
          <FooterCol
            title="Get in touch"
            links={[
              { label: "Request access", href: "/register" },
              { label: "Recruiter sign in", href: "/login" },
            ]}
          />
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-neutral-200 pt-6 sm:flex-row">
          <p className="text-sm text-neutral-500">© {year} SkillScout. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-neutral-500">
            <Link href="/privacy" className="transition-colors hover:text-neutral-900">
              Privacy policy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-neutral-900">
              Terms of service
            </Link>
            <Link href="/security" className="transition-colors hover:text-neutral-900">
              Security
            </Link>
            <CookieSettings className="transition-colors hover:text-neutral-900" />
          </div>
        </div>
      </div>
    </footer>
  );
}
