import type { HTMLAttributes } from "react";

import { clsx } from "clsx";

type CardVariant = "glass" | "solid";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  interactive?: boolean;
};

// Level 2 surface — 16px radius glass module that floats over the atmospheric base.
const variantClasses: Record<CardVariant, string> = {
  glass: "glass-panel",
  solid: "bg-white border border-neutral-200 shadow-panel",
};

export function Card({
  className,
  variant = "solid",
  interactive = false,
  ...props
}: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-lg p-6",
        variantClasses[variant],
        interactive &&
          "cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glass",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("mb-4 flex items-center justify-between gap-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={clsx("text-lg font-semibold tracking-tight text-neutral-900", className)}
      {...props}
    />
  );
}
