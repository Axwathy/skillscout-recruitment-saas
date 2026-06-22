import type { HTMLAttributes } from "react";

import { clsx } from "clsx";

type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-neutral-100 text-neutral-700",
  accent: "bg-primary-50 text-primary-700",
  success: "bg-success-50 text-success-600",
  warning: "bg-warning-50 text-warning-600",
  danger: "bg-danger-50 text-danger-600",
};

// Small status pill with uppercase metadata treatment.
export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-label",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
