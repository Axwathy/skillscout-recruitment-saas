import type { HTMLAttributes } from "react";
import { X } from "lucide-react";

import { clsx } from "clsx";

type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  active?: boolean;
  onDismiss?: () => void;
};

// Pill filter chip — light-gray base, bolder when active, optional dismiss "x".
export function Chip({ className, active = false, onDismiss, children, ...props }: ChipProps) {
  return (
    <span
      className={clsx(
        "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm transition-colors",
        active
          ? "bg-neutral-900 font-semibold text-white"
          : "bg-neutral-100 font-medium text-neutral-700 hover:bg-neutral-200",
        className,
      )}
      {...props}
    >
      {children}
      {onDismiss && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="-mr-1 flex h-4 w-4 items-center justify-center rounded-full transition-colors hover:bg-black/10"
          aria-label="Remove filter"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
