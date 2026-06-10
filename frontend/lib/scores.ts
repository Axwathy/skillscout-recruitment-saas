import type { ScoreValue } from "@/types/jobs";

export function normalizeScore(value: ScoreValue | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(1, parsed));
}

export function scorePercent(value: ScoreValue | undefined): number | null {
  const normalized = normalizeScore(value);
  return normalized === null ? null : Math.round(normalized * 100);
}

export function formatScore(value: ScoreValue | undefined): string {
  const percent = scorePercent(value);
  return percent === null ? "--" : String(percent);
}

export function scoreTone(value: ScoreValue | undefined): string {
  const percent = scorePercent(value);
  if (percent === null) return "bg-neutral-100 text-neutral-500";
  if (percent >= 85) return "bg-success-600/10 text-success-600";
  if (percent >= 70) return "bg-primary-50 text-primary-700";
  if (percent >= 50) return "bg-warning-600/10 text-warning-600";
  return "bg-danger-600/10 text-danger-600";
}

export function scoreBarColor(value: ScoreValue | undefined): string {
  const percent = scorePercent(value);
  if (percent === null) return "bg-neutral-200";
  if (percent >= 85) return "bg-success-600";
  if (percent >= 70) return "bg-primary-600";
  if (percent >= 50) return "bg-warning-600";
  return "bg-danger-600";
}
