"use client";

import { useCallback, useEffect, useState } from "react";
import type { ElementType } from "react";
import { X } from "lucide-react";

export type OnboardingStep = {
  icon: ElementType;
  title: string;
  description: string;
};

const TOUR_EVENT = "skillscout:tour";

/** Re-open the walkthrough from anywhere (e.g. a "?" help button). */
export function openOnboardingTour() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TOUR_EVENT));
  }
}

/**
 * A concise, skippable welcome walkthrough — shows once per user (persisted in
 * localStorage) and can be re-opened on demand. Role-personalized via `steps`.
 */
export function OnboardingModal({
  steps,
  storageKey,
  eyebrow = "Getting started",
}: {
  steps: OnboardingStep[];
  storageKey: string;
  eyebrow?: string;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let done = false;
    try {
      done = localStorage.getItem(storageKey) === "1";
    } catch {
      done = false;
    }
    if (!done) setOpen(true);

    const handler = () => {
      setIndex(0);
      setOpen(true);
    };
    window.addEventListener(TOUR_EVENT, handler);
    return () => window.removeEventListener(TOUR_EVENT, handler);
  }, [storageKey]);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
    setIndex(0);
  }, [storageKey]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, finish]);

  if (!open || steps.length === 0) return null;

  const step = steps[index];
  const isLast = index === steps.length - 1;
  const Icon = step.icon;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome walkthrough"
    >
      <div
        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
        onClick={finish}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md animate-fade-in rounded-[24px] border border-neutral-200/70 bg-white p-8 shadow-glass-lg">
        <button
          type="button"
          onClick={finish}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
          aria-label="Skip walkthrough"
        >
          <X className="h-4 w-4" />
        </button>

        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#EB4425]">
          {eyebrow}
        </span>

        <div className="mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EB4425]/10 text-[#EB4425]">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>

        <h2 className="mt-5 text-xl font-bold tracking-tight text-neutral-900">{step.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">{step.description}</p>

        {/* Progress */}
        <div className="mt-6 flex items-center gap-1.5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? "w-6 bg-[#EB4425]" : "w-1.5 bg-neutral-200"
              }`}
            />
          ))}
        </div>

        <div className="mt-7 flex items-center justify-between">
          <button
            type="button"
            onClick={finish}
            className="text-sm font-medium text-neutral-400 transition-colors hover:text-neutral-700"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:border-neutral-900"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? finish() : setIndex((i) => i + 1))}
              className="rounded-full bg-[#EB4425] px-5 py-2 text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(235,68,37,0.5)] transition-all hover:bg-[#D93719]"
            >
              {isLast ? "Get started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
