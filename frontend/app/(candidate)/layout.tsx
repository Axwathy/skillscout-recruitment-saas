"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BriefcaseBusiness, LayoutDashboard, LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/candidate/dashboard", icon: LayoutDashboard },
  { name: "My Applications", href: "/candidate/applications", icon: BriefcaseBusiness },
  { name: "Profile", href: "/candidate/profile", icon: User },
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
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Top navigation bar */}
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link href="/candidate/dashboard" className="text-base font-bold text-primary-600">
            RecruitAI
          </Link>

          {/* Nav links */}
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary-50 text-primary-600"
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
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
              {user?.first_name ? user.first_name[0].toUpperCase() : "C"}
            </div>
            <span className="hidden text-sm font-medium text-neutral-700 sm:block">
              {user?.first_name} {user?.last_name}
            </span>
            <button
              onClick={logout}
              className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="flex border-t border-neutral-100 sm:hidden">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                  active ? "text-primary-600" : "text-neutral-500"
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
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
