"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  BarChart3,
  Briefcase,
  FileText,
  GitBranch,
  HelpCircle,
  Home,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Search,
  Settings,
  Users,
  Radar,
} from "lucide-react";

import { NotificationBell } from "@/components/NotificationBell";
import {
  OnboardingModal,
  openOnboardingTour,
  type OnboardingStep,
} from "@/components/OnboardingModal";

const RECRUITER_STEPS: OnboardingStep[] = [
  {
    icon: Radar,
    title: "Welcome to SkillScout",
    description:
      "Your AI-assisted hiring workspace. Math ranks candidates, AI explains why — you stay in control of every decision.",
  },
  {
    icon: Briefcase,
    title: "Post a job",
    description:
      "Create and publish a role from the Jobs tab. Applications flow straight into your pipeline.",
  },
  {
    icon: BarChart3,
    title: "Let AI rank candidates",
    description:
      "Every applicant is scored on skills, semantic fit, and experience — with a clear breakdown you can trust.",
  },
  {
    icon: GitBranch,
    title: "Move people through hiring",
    description:
      "Drag candidates across pipeline stages, search talent by meaning, and track results in Insights.",
  },
];

const NAV_ITEMS = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Jobs", href: "/dashboard/jobs", icon: Briefcase },
  { name: "Applications", href: "/dashboard/applications", icon: FileText },
  { name: "Pipeline", href: "/dashboard/pipeline", icon: GitBranch },
  { name: "Candidates", href: "/dashboard/candidates", icon: Users },
  { name: "Insights", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Bulk Screening", href: "/dashboard/batch", icon: ListChecks },
];

function RailLink({
  href,
  name,
  active,
  children,
}: {
  href: string;
  name: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="group relative flex items-center justify-center">
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200 ${
          active
            ? "bg-[#EB4425] text-white shadow-[0_8px_20px_-6px_rgba(235,68,37,0.6)]"
            : "text-neutral-400 hover:bg-white/10 hover:text-white"
        }`}
      >
        {children}
      </span>
      {/* Tooltip */}
      <span className="pointer-events-none absolute left-14 z-50 whitespace-nowrap rounded-lg bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-white opacity-0 shadow-glass transition-opacity duration-150 group-hover:opacity-100">
        {name}
      </span>
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isLoading, refreshSession } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const isCandidateUser = user?.role === "candidate";
  const sessionChecked = React.useRef(false);

  React.useEffect(() => {
    if (!user && !sessionChecked.current) {
      sessionChecked.current = true;
      refreshSession().then((refreshedUser) => {
        if (!refreshedUser) {
          router.push("/login");
        }
      });
    }
  }, [refreshSession, router, user]);

  React.useEffect(() => {
    if (!isLoading && isCandidateUser) {
      router.push("/candidate/dashboard");
    }
  }, [isCandidateUser, isLoading, router]);

  if (!user || isLoading || isCandidateUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#EB4425] border-t-transparent" />
      </div>
    );
  }

  const isSearchActive = pathname.startsWith("/dashboard/search");

  return (
    <div className="flex min-h-screen">
      {/* Dark icon rail */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-[76px] flex-col items-center gap-3 bg-neutral-900 py-5">
        {/* Brand logo */}
        <Link
          href="/dashboard"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EB4425] text-white shadow-[0_8px_20px_-6px_rgba(235,68,37,0.6)]"
          aria-label="SkillScout home"
        >
          <Radar className="h-5 w-5" />
        </Link>

        {/* Accent search button */}
        <Link
          href="/dashboard/search"
          className={`group relative mt-2 flex items-center justify-center`}
          aria-label="Find talent"
        >
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200 ${
              isSearchActive
                ? "bg-[#EB4425] text-white shadow-[0_8px_20px_-6px_rgba(235,68,37,0.6)]"
                : "bg-[#EB4425]/90 text-white hover:bg-[#EB4425]"
            }`}
          >
            <Search className="h-5 w-5" />
          </span>
          <span className="pointer-events-none absolute left-14 z-50 whitespace-nowrap rounded-lg bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-white opacity-0 shadow-glass transition-opacity duration-150 group-hover:opacity-100">
            Find Talent
          </span>
        </Link>

        {/* Section icons */}
        <nav className="mt-2 flex flex-col items-center gap-2" aria-label="Dashboard navigation">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <RailLink key={item.name} href={item.href} name={item.name} active={active}>
                <item.icon className="h-5 w-5" />
              </RailLink>
            );
          })}
        </nav>

        {/* Bottom: settings + avatar */}
        <div className="mt-auto flex flex-col items-center gap-3">
          <RailLink
            href="/dashboard/settings/notifications"
            name="Settings"
            active={pathname.startsWith("/dashboard/settings")}
          >
            <Settings className="h-5 w-5" />
          </RailLink>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EB4425]/20 text-sm font-bold text-white ring-2 ring-white/10 transition hover:ring-white/30"
              aria-label="Account menu"
            >
              {user?.first_name ? user.first_name[0].toUpperCase() : "U"}
            </button>
            {menuOpen && (
              <div className="absolute bottom-0 left-14 z-50 w-56 animate-fade-in rounded-xl border border-neutral-200 bg-white p-1 shadow-glass-lg">
                <div className="border-b border-neutral-100 px-3 py-2">
                  <p className="truncate text-sm font-semibold text-neutral-900">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="truncate text-xs text-neutral-500">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-danger-600 transition-colors hover:bg-danger-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col pl-[76px]">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-neutral-200/70 bg-white/70 px-4 backdrop-blur-glass sm:px-8">
          <div className="min-w-0">
            {user?.recruiter_profile?.organization && (
              <span className="truncate text-sm font-semibold text-neutral-700">
                {user.recruiter_profile.organization.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              title="Back to home"
              aria-label="Back to home"
            >
              <Home className="h-5 w-5" />
            </Link>
            <button
              type="button"
              onClick={openOnboardingTour}
              className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              title="Take a tour"
              aria-label="Take a tour"
            >
              <HelpCircle className="h-5 w-5" />
            </button>
            <NotificationBell />
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      <OnboardingModal
        steps={RECRUITER_STEPS}
        storageKey={`skillscout.onboarding.recruiter.${user.email}`}
        eyebrow="Welcome to SkillScout"
      />
    </div>
  );
}
