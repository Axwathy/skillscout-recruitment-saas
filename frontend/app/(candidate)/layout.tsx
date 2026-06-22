"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  HelpCircle,
  Home,
  LayoutDashboard,
  LogOut,
  Radar,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  OnboardingModal,
  openOnboardingTour,
  type OnboardingStep,
} from "@/components/OnboardingModal";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/candidate/dashboard", icon: LayoutDashboard },
  { name: "My Applications", href: "/candidate/applications", icon: BriefcaseBusiness },
  { name: "Profile", href: "/candidate/profile", icon: User },
];

const CANDIDATE_STEPS: OnboardingStep[] = [
  {
    icon: Radar,
    title: "Welcome to SkillScout",
    description: "Find roles that match your skills and track every application in one place.",
  },
  {
    icon: User,
    title: "Build your profile",
    description:
      "Add your skills, experience, projects, and education so recruiters see the best of you.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Apply and track",
    description:
      "Browse open roles, apply in a click, and follow each application from applied to hired.",
  },
];

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isLoading, refreshSession } = useAuth();
  const isNonCandidateUser = Boolean(user && user.role !== "candidate");
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
    if (!isLoading && isNonCandidateUser) {
      router.push("/dashboard");
    }
  }, [isLoading, isNonCandidateUser, router]);

  if (!user || isLoading || isNonCandidateUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Top navigation bar */}
      <header className="sticky top-0 z-20 border-b border-neutral-200/70 bg-white/70 backdrop-blur-glass">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link href="/candidate/dashboard" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EB4425] text-white shadow-[0_8px_20px_-6px_rgba(235,68,37,0.6)]">
              <Radar className="h-4 w-4" />
            </span>
            <span className="text-base font-bold tracking-tight text-neutral-900">SkillScout</span>
          </Link>

          {/* Nav links */}
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors ${
                    active
                      ? "bg-[#EB4425]/10 text-[#EB4425]"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                  }`}
                >
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User + logout */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              title="Back to home"
              aria-label="Back to home"
            >
              <Home className="h-4 w-4" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={openOnboardingTour}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              title="Take a tour"
              aria-label="Take a tour"
            >
              <HelpCircle className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
              {user?.first_name ? user.first_name[0].toUpperCase() : "C"}
            </div>
            <span className="hidden text-sm font-medium text-neutral-700 sm:block">
              {user?.first_name} {user?.last_name}
            </span>
            <button
              onClick={logout}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="flex border-t border-neutral-200/70 sm:hidden">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                  active ? "text-primary-700" : "text-neutral-500"
                }`}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Page content */}
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {children}
      </main>

      <OnboardingModal
        steps={CANDIDATE_STEPS}
        storageKey={`skillscout.onboarding.candidate.${user.email}`}
        eyebrow="Welcome to SkillScout"
      />
    </div>
  );
}
