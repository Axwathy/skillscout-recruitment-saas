"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ElementType } from "react";
import dynamic from "next/dynamic";
import {
  BadgeCheck,
  Briefcase,
  ChevronDown,
  Clock3,
  Download,
  ImageDown,
  Sparkles,
  Users,
} from "lucide-react";

import { getAnalyticsDashboard, getAnalyticsExport } from "@/lib/analytics";
import { RadialGrowthChart } from "@/components/ui/RadialGrowthChart";
import type {
  AnalyticsDashboardResponse,
  AnalyticsSeriesPoint,
  SourceEffectivenessRow,
  TeamActivityRow,
} from "@/types/analytics";

const STAGE_LABELS: Record<string, string> = {
  applications: "Applications",
  screened: "Screened",
  interviewed: "Interviewed",
  offers: "Offers",
  hires: "Hires",
};

const FUNNEL_COLORS = ["#EB4425", "#D93719", "#B51D00", "#8E1500", "#3E0400"];

const ResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false },
);
const BarChart = dynamic(() => import("recharts").then((mod) => mod.BarChart), {
  ssr: false,
});
const Bar = dynamic(() => import("recharts").then((mod) => mod.Bar), { ssr: false });
const LabelList = dynamic(() => import("recharts").then((mod) => mod.LabelList), {
  ssr: false,
});
const LineChart = dynamic(() => import("recharts").then((mod) => mod.LineChart), {
  ssr: false,
});
const Line = dynamic(() => import("recharts").then((mod) => mod.Line), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), {
  ssr: false,
});
const XAxis = dynamic(() => import("recharts").then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((mod) => mod.YAxis), { ssr: false });

const PRESETS: Array<{ label: string; days: number | null }> = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "All time", days: null },
];

function startForDays(days: number | null): string | undefined {
  if (days === null) return undefined;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return `${Math.round(value * 100)}%`;
}

function formatTrend(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  const sign = value > 0 ? "+" : "";
  return `${sign}${Math.round(value * 100)}%`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadChartPng(container: HTMLDivElement | null, filename: string) {
  const svg = container?.querySelector("svg");
  if (!svg) return;

  const clone = svg.cloneNode(true) as SVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const bounds = svg.getBoundingClientRect();
  const width = Math.max(Math.round(bounds.width), 1);
  const height = Math.max(Math.round(bounds.height), 1);
  const svgText = new XMLSerializer().serializeToString(clone);
  const image = new Image();
  const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Could not export chart."));
    image.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  URL.revokeObjectURL(url);
  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, filename);
  }, "image/png");
}

function Sparkline({
  data,
  dataKey,
}: {
  data: AnalyticsSeriesPoint[];
  dataKey: "applications" | "hires";
}) {
  if (data.length < 2) return null;
  return (
    <div className="mt-3 h-10">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke="#EB4425"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  trend,
  series,
  seriesKey,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: number | null;
  series?: AnalyticsSeriesPoint[];
  seriesKey?: "applications" | "hires";
  icon?: ElementType;
}) {
  const trendText = formatTrend(trend);
  const trendTone =
    trend === null || trend === undefined
      ? "text-neutral-400"
      : trend >= 0
        ? "text-success-600"
        : "text-danger-600";

  return (
    <div className="rounded-[20px] border border-neutral-200/70 bg-white p-5 shadow-glass">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">{label}</p>
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EB4425]/10 text-[#EB4425]">
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="mt-3 flex items-end gap-2">
        <p className="text-3xl font-bold tracking-tight text-neutral-900">{value}</p>
        {trendText && <span className={`pb-1 text-xs font-semibold ${trendTone}`}>{trendText}</span>}
      </div>
      {hint && <p className="text-xs text-neutral-400">{hint}</p>}
      {series && seriesKey && <Sparkline data={series} dataKey={seriesKey} />}
    </div>
  );
}

function PanelActions({
  onCsv,
  onPng,
}: {
  onCsv: () => void;
  onPng?: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onCsv}
        className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
      >
        <Download className="h-3.5 w-3.5" />
        CSV
      </button>
      {onPng && (
        <button
          type="button"
          onClick={onPng}
          className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          <ImageDown className="h-3.5 w-3.5" />
          PNG
        </button>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const [presetDays, setPresetDays] = useState<number | null>(30);
  const [dashboard, setDashboard] = useState<AnalyticsDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timeToHireRef = useRef<HTMLDivElement | null>(null);
  const sourcesRef = useRef<HTMLDivElement | null>(null);

  const params = useMemo(() => ({ start: startForDays(presetDays) }), [presetDays]);

  const load = useCallback(async () => {
    try {
      setDashboard(await getAnalyticsDashboard(params));
      setError(null);
    } catch {
      setError("Could not load analytics.");
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  async function handleCsv(metric: string) {
    try {
      const blob = await getAnalyticsExport(metric, params);
      downloadBlob(blob, `analytics-${metric}.csv`);
    } catch {
      setError("Could not export analytics CSV.");
    }
  }

  const overview = dashboard?.overview;
  const funnel = dashboard?.funnel;
  const timeToHire = dashboard?.time_to_hire;
  const sources = dashboard?.sources;
  const teamActivity = dashboard?.team_activity;

  const tthData =
    timeToHire?.by_job
      .filter((job) => job.average_days !== null)
      .map((job) => ({ name: job.job_title, days: job.average_days })) ?? [];

  const sourceData =
    sources?.sources
      .filter((source) => source.applications > 0)
      .map((source) => ({
        name: source.source_label,
        applications: source.applications,
        hires: source.hires,
        conversion: source.conversion_rate,
      })) ?? [];

  const offerAcceptance = formatPercent(overview?.offer_acceptance_rate);
  const avgTth =
    overview?.average_time_to_hire_days != null
      ? `${overview.average_time_to_hire_days} d`
      : "-";

  return (
    <div className="space-y-6">
      {/* Hero + big radial chart with floating funnel card */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EB4425]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#EB4425]">
            <Sparkles className="h-3 w-3" /> KPIs &amp; Analytics
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
            Insights
          </h1>
          <p className="mt-3 max-w-md text-base text-neutral-500">
            Pipeline funnel, source performance, team activity, and hiring KPIs.
          </p>
        </div>

        <div className="relative h-[300px]">
          <RadialGrowthChart
            axisStart="Applications"
            axisEnd="Hires"
            caption="Pipeline Funnel Conversion"
            cornerLabel="Q1"
          />

          {/* Floating funnel card overlapping the chart */}
          <div className="absolute right-0 top-0 z-10 w-56 rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-glass">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-neutral-900">Pipeline Funnel</h2>
              <ChevronDown className="h-4 w-4 rotate-180 text-neutral-400" />
            </div>
            <div className="mt-3 space-y-2">
              {(funnel?.stages ?? []).slice(0, 4).map((stage, i) => (
                <div key={stage.stage} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-neutral-600">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }}
                    />
                    {STAGE_LABELS[stage.stage] ?? stage.stage}
                  </span>
                  <span className="font-semibold text-neutral-400">({stage.count})</span>
                </div>
              ))}
              {(!funnel || funnel.stages.length === 0) && (
                <p className="text-sm text-neutral-400">No data yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar: date range + export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-full border border-neutral-200 bg-white p-1">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setPresetDays(preset.days)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                presetDays === preset.days
                  ? "bg-[#EB4425] text-white"
                  : "text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <PanelActions onCsv={() => handleCsv("overview")} />
      </div>

      {error && (
        <div className="rounded-md border border-danger-600/20 bg-danger-600/10 px-4 py-2 text-sm text-danger-600">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="py-20 text-center text-sm text-neutral-400">Loading analytics...</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Total applicants"
              value={String(overview?.total_applications ?? 0)}
              trend={overview?.trends.total_applications}
              series={overview?.series}
              seriesKey="applications"
              icon={Users}
            />
            <MetricCard
              label="Open positions"
              value={String(overview?.open_positions ?? 0)}
              trend={overview?.trends.open_positions}
              icon={Briefcase}
            />
            <MetricCard
              label="Avg time to hire"
              value={avgTth}
              hint={`${overview?.hires ?? 0} hire${(overview?.hires ?? 0) === 1 ? "" : "s"}`}
              trend={overview?.trends.average_time_to_hire_days}
              icon={Clock3}
            />
            <MetricCard
              label="Offer acceptance"
              value={offerAcceptance}
              hint="hired / reached offer"
              trend={overview?.trends.offer_acceptance_rate}
              series={overview?.series}
              seriesKey="hires"
              icon={BadgeCheck}
            />
          </div>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="glass-panel rounded-lg p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-neutral-900">Time to hire</h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Average days from application to hire, by job.
                  </p>
                </div>
                <PanelActions
                  onCsv={() => handleCsv("time-to-hire")}
                  onPng={() =>
                    downloadChartPng(timeToHireRef.current, "analytics-time-to-hire.png")
                  }
                />
              </div>
              <div ref={timeToHireRef} className="mt-4 h-64 w-full">
                {tthData.length === 0 ? (
                  <p className="py-16 text-center text-sm text-neutral-400">
                    No hires in this period yet.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tthData} margin={{ left: 8, right: 16 }}>
                      <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip formatter={(value) => [`${value} days`, "Avg time to hire"]} />
                      <Bar dataKey="days" fill="#EB4425" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="days" position="top" fontSize={12} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="glass-panel rounded-lg p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-neutral-900">
                    Source effectiveness
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Applications and hires by application source.
                  </p>
                </div>
                <PanelActions
                  onCsv={() => handleCsv("sources")}
                  onPng={() => downloadChartPng(sourcesRef.current, "analytics-sources.png")}
                />
              </div>
              <div ref={sourcesRef} className="mt-4 h-64 w-full">
                {sourceData.length === 0 ? (
                  <p className="py-16 text-center text-sm text-neutral-400">
                    No source data in this period yet.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sourceData} margin={{ left: 8, right: 16 }}>
                      <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                      <YAxis stroke="#9ca3af" fontSize={12} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="applications" fill="#EB4425" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="hires" fill="#16A34A" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <SourceTable rows={sources?.sources ?? []} />
            </div>
          </section>

          <section className="glass-panel rounded-lg p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-neutral-900">Team activity</h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Recruiter activity ranked by candidates processed.
                </p>
              </div>
              <PanelActions onCsv={() => handleCsv("team-activity")} />
            </div>
            <TeamActivityTable rows={teamActivity?.recruiters ?? []} />
          </section>
        </>
      )}
    </div>
  );
}

function SourceTable({ rows }: { rows: SourceEffectivenessRow[] }) {
  const activeRows = rows.filter((row) => row.applications > 0);
  if (activeRows.length === 0) return null;

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-left text-xs uppercase text-neutral-500">
          <tr>
            <th className="px-3 py-2">Source</th>
            <th className="px-3 py-2">Applications</th>
            <th className="px-3 py-2">Offers</th>
            <th className="px-3 py-2">Hires</th>
            <th className="px-3 py-2">Conversion</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {activeRows.map((row) => (
            <tr key={row.source}>
              <td className="px-3 py-2 font-medium text-neutral-900">{row.source_label}</td>
              <td className="px-3 py-2 text-neutral-600">{row.applications}</td>
              <td className="px-3 py-2 text-neutral-600">{row.offers}</td>
              <td className="px-3 py-2 text-neutral-600">{row.hires}</td>
              <td className="px-3 py-2 text-neutral-600">{formatPercent(row.conversion_rate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TeamActivityTable({ rows }: { rows: TeamActivityRow[] }) {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-neutral-400">No team activity yet.</p>;
  }

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-left text-xs uppercase text-neutral-500">
          <tr>
            <th className="px-3 py-2">Recruiter</th>
            <th className="px-3 py-2">Candidates</th>
            <th className="px-3 py-2">Status updates</th>
            <th className="px-3 py-2">Interviews</th>
            <th className="px-3 py-2">Hires</th>
            <th className="px-3 py-2">Avg response</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((row) => (
            <tr key={row.recruiter_id}>
              <td className="px-3 py-2">
                <p className="font-medium text-neutral-900">{row.name}</p>
                <p className="text-xs text-neutral-500">{row.email}</p>
              </td>
              <td className="px-3 py-2 text-neutral-600">{row.candidates_processed}</td>
              <td className="px-3 py-2 text-neutral-600">{row.status_updates}</td>
              <td className="px-3 py-2 text-neutral-600">{row.interviews_conducted}</td>
              <td className="px-3 py-2 text-neutral-600">{row.hires}</td>
              <td className="px-3 py-2 text-neutral-600">
                {row.average_response_hours == null ? "-" : `${row.average_response_hours} h`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
