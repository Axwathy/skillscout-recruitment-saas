type RadialChartProps = {
  axisStart?: string;
  axisEnd?: string;
  caption?: string;
  cornerLabel?: string;
};

/**
 * Reference "analysis" graph — a large, borderless quarter-circle radial gradient
 * sweeping from the accent (#EB4425, dense at the bottom-right) out to transparent,
 * with a thin arc edge, axis labels and small captions. Fills its parent container.
 */
export function RadialGrowthChart({
  axisStart = "Applications",
  axisEnd = "Hires",
  caption = "Pipeline Funnel Conversion",
  cornerLabel = "Q1",
}: RadialChartProps) {
  return (
    <div className="relative h-full min-h-[280px] w-full">
      <svg
        viewBox="0 0 600 340"
        preserveAspectRatio="xMaxYMax meet"
        className="absolute inset-0 h-full w-full overflow-visible"
        style={{ fontFamily: "var(--font-urbanist), ui-sans-serif" }}
      >
        <defs>
          <radialGradient id="rgFill" cx="100%" cy="100%" r="100%">
            <stop offset="0%" stopColor="#EB4425" stopOpacity="0.5" />
            <stop offset="42%" stopColor="#EB4425" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#EB4425" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Filled quarter disc — centre at bottom-right (600,340), radius 330 */}
        <path d="M 270 340 A 330 330 0 0 1 600 10 L 600 340 Z" fill="url(#rgFill)" />

        {/* Arc edge */}
        <path
          d="M 270 340 A 330 330 0 0 1 600 10"
          fill="none"
          stroke="#EB4425"
          strokeWidth="1.5"
          strokeOpacity="0.55"
        />

        {/* Baseline */}
        <line x1="270" y1="340" x2="600" y2="340" stroke="#D2D2D0" strokeWidth="1" strokeDasharray="2 6" />

        {/* Data dots */}
        <circle cx="356" cy="250" r="4.5" fill="#EB4425" />
        <circle cx="556" cy="118" r="4.5" fill="#EB4425" />

        {/* Axis labels */}
        <text x="300" y="244" fontSize="15" fontWeight="500" fill="#525252">
          {axisStart}
        </text>
        <text x="566" y="110" fontSize="15" fontWeight="500" fill="#525252">
          {axisEnd}
        </text>

        {/* Corner captions */}
        <text x="282" y="333" fontSize="12" fill="#A3A3A3">
          {cornerLabel}
        </text>
        <text x="592" y="333" fontSize="12" fill="#A3A3A3" textAnchor="end">
          {caption}
        </text>
      </svg>
    </div>
  );
}
