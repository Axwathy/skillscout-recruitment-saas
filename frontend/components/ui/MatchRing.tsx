import { clsx } from "clsx";

type MatchRingProps = {
  /** Match percentage, 0–100. */
  value: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  className?: string;
};

/**
 * Signature match-score ring (Stitch spec): a circular #EB4425 progress arc
 * over a dotted light-gray track, with the percentage centered inside.
 */
export function MatchRing({
  value,
  size = 64,
  strokeWidth = 6,
  showLabel = true,
  className,
}: MatchRingProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const center = size / 2;

  return (
    <div
      className={clsx("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${pct}% match`}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* Dotted light-gray track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#E2E2E2"
          strokeWidth={strokeWidth}
          strokeDasharray="1 5"
          strokeLinecap="round"
        />
        {/* Accent progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#EB4425"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      {showLabel && (
        <span
          className="absolute font-semibold tabular-nums text-neutral-900"
          style={{ fontSize: size * 0.26 }}
        >
          {pct}
          <span className="text-neutral-400" style={{ fontSize: size * 0.16 }}>
            %
          </span>
        </span>
      )}
    </div>
  );
}

/** Strength label from a match score, e.g. "Strong Match". */
export function matchStrength(value: number): { label: string; tone: "success" | "accent" | "neutral" } {
  if (value >= 85) return { label: "Strong Match", tone: "success" };
  if (value >= 70) return { label: "Good Match", tone: "accent" };
  return { label: "Partial Match", tone: "neutral" };
}
