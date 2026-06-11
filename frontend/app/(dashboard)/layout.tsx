"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  BarChart3,
  Briefcase,
  ChevronDown,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Search,
  Users,
  Zap,
} from "lucide-react";

import { NotificationBell } from "@/components/NotificationBell";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", active: true, icon: LayoutDashboard },
  { name: "Jobs", href: "/dashboard/jobs", active: true, icon: Briefcase },
  { name: "Applications", href: "/dashboard/applications", active: true, icon: Users },
  { name: "Pipeline", href: "/dashboard/pipeline", active: true, icon: GitBranch },
  { name: "Candidates", href: "/dashboard/candidates", active: true, icon: Users },
  { name: "Search", href: "/dashboard/search", active: true, icon: Search },
  { name: "Analytics", href: "/analytics", active: false, icon: BarChart3 },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Sidebar */}
      <aside
        className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-neutral-200 bg-white shadow-sm lg:flex z-20"
        aria-label="Sidebar navigation"
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center border-b border-neutral-100 px-6 gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white">
            <Zap className="h-4 w-4" />
          </div>
          <Link href="/dashboard" className="text-base font-bold text-neutral-900 tracking-tight">
            RecruitAI
          </Link>
        </div>

        {/* Org Banner */}
        {user?.recruiter_profile?.organization && (
          <div className="px-4 pt-5 pb-2">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 px-3 py-2 text-sm font-semibold text-neutral-700 truncate shadow-sm">
              {user.recruiter_profile.organization.name}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto" aria-label="Dashboard navigation">
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <div key={item.name}>
                  {item.active ? (
                    <Link
                      href={item.href}
                      className={`group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-primary-50 text-primary-700"
                          : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                      }`}
                    >
                      <item.icon className={`h-4 w-4 transition-colors ${isActive ? "text-primary-600" : "text-neutral-400 group-hover:text-neutral-600"}`} />
                      {item.name}
                    </Link>
                  ) : (
                    <div
                      className="group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-neutral-400 cursor-not-allowed select-none"
                      title="Available in later sprints"
                    >
                      <item.icon className="h-4 w-4 opacity-50" />
                      {item.name}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </nav>

        {/* User Menu Area */}
        <div className="border-t border-neutral-100 p-4 relative bg-neutral-50/50">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center w-full rounded-lg p-2 transition-colors hover:bg-neutral-200/50 focus:outline-none"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 shrink-0 ring-2 ring-white">
              {user?.first_name ? user.first_name[0].toUpperCase() : "U"}
            </div>
            <div className="ml-3 flex-1 overflow-hidden text-left">
              <p className="truncate text-sm font-semibold text-neutral-900">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="truncate text-xs text-neutral-500">{user?.email}</p>
            </div>
            <ChevronDown className={`ml-2 h-4 w-4 text-neutral-400 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`} />
          </button>

          {/* User Dropdown */}
          {menuOpen && (
            <div className="absolute bottom-[4.5rem] left-4 right-4 rounded-xl border border-neutral-200 bg-white p-1 shadow-lg animate-in slide-in-from-bottom-2 fade-in duration-200 z-50">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-danger-600 transition-colors hover:bg-danger-50"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top bar — logo on mobile, notification bell on all sizes */}
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 bg-white/80 backdrop-blur-md px-4 sm:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <Zap className="h-5 w-5 text-primary-600" />
            <span className="text-base font-bold text-neutral-900 tracking-tight">
              RecruitAI
            </span>
          </div>
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-neutral-50 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
