import type { ElementType, ReactNode } from "react";

import { clsx } from "clsx";

type EmptyStateProps = {
  icon?: ElementType;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

/** Friendly empty state for list/result views — icon, message, and an optional CTA. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center rounded-[20px] border border-dashed border-neutral-300 bg-white/50 px-6 py-16 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#EB4425]/10 text-[#EB4425]">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>
      )}
      <p className="text-base font-semibold text-neutral-900">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
