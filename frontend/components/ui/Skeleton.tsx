import { clsx } from "clsx";

/** Subtle shimmering placeholder used while content loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-md bg-neutral-200/70", className)} />;
}
