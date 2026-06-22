"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "skillscout.cookie-prefs";

type Prefs = { necessary: true; analytics: boolean; marketing: boolean };

const DEFAULTS: Prefs = { necessary: true, analytics: true, marketing: false };

export function CookieSettings({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPrefs({ ...DEFAULTS, ...JSON.parse(raw), necessary: true });
    } catch {
      /* ignore */
    }
  }, []);

  function save(next: Prefs) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setPrefs(next);
    setOpen(false);
  }

  const rows: { key: keyof Prefs; label: string; desc: string; locked?: boolean }[] = [
    {
      key: "necessary",
      label: "Strictly necessary",
      desc: "Required for sign-in, security, and core functionality. Always on.",
      locked: true,
    },
    {
      key: "analytics",
      label: "Analytics",
      desc: "Helps us understand usage to improve the product. No personal selling.",
    },
    {
      key: "marketing",
      label: "Marketing",
      desc: "Used to measure and personalize campaigns. Off by default.",
    },
  ];

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        Cookie settings
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Cookie settings"
        >
          <div
            className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-lg animate-fade-in rounded-[24px] border border-neutral-200/70 bg-white p-7 shadow-glass-lg">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-lg font-bold tracking-tight text-neutral-900">Cookie settings</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Choose which cookies SkillScout may use. You can change this anytime.
            </p>

            <div className="mt-5 space-y-2">
              {rows.map((row) => (
                <label
                  key={row.key}
                  className={`flex items-start gap-3 rounded-xl border border-neutral-200 p-4 ${
                    row.locked ? "bg-neutral-50" : "cursor-pointer hover:border-neutral-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={prefs[row.key]}
                    disabled={row.locked}
                    onChange={(e) =>
                      setPrefs((p) => ({ ...p, [row.key]: e.target.checked, necessary: true }))
                    }
                    className="mt-0.5 h-4 w-4 rounded border-neutral-300 accent-[#EB4425]"
                  />
                  <span>
                    <span className="text-sm font-semibold text-neutral-900">{row.label}</span>
                    <span className="mt-0.5 block text-xs text-neutral-500">{row.desc}</span>
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => save({ necessary: true, analytics: false, marketing: false })}
                className="rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:border-neutral-900"
              >
                Reject all
              </button>
              <button
                type="button"
                onClick={() => save(prefs)}
                className="rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:border-neutral-900"
              >
                Save choices
              </button>
              <button
                type="button"
                onClick={() => save({ necessary: true, analytics: true, marketing: true })}
                className="rounded-full bg-[#EB4425] px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(235,68,37,0.5)] transition-all hover:bg-[#D93719]"
              >
                Accept all
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
