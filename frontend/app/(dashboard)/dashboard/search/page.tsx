"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  Filter,
  MapPin,
  Search,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";

import { semanticSearch } from "@/lib/search";
import type { RemotePolicy } from "@/types/jobs";
import type { SearchFilters, SearchResponse, SearchResult, SearchType } from "@/types/search";

const SEARCH_TYPES: Array<{ value: SearchType; label: string }> = [
  { value: "all", label: "All" },
  { value: "candidates", label: "Candidates" },
  { value: "jobs", label: "Jobs" },
];

const REMOTE_OPTIONS: Array<{ value: RemotePolicy | ""; label: string }> = [
  { value: "", label: "Any work mode" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Any status" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "closed", label: "Closed" },
  { value: "archived", label: "Archived" },
];

function scoreClass(score: number) {
  if (score >= 85) return "bg-success-600/10 text-success-600";
  if (score >= 70) return "bg-primary-50 text-primary-700";
  if (score >= 50) return "bg-warning-600/10 text-warning-600";
  return "bg-danger-600/10 text-danger-600";
}

function resultIcon(type: SearchResult["type"]) {
  return type === "candidate" ? UserRound : BriefcaseBusiness;
}

function hasActiveFilters(filters: SearchFilters) {
  return Boolean(
    filters.skills ||
      filters.min_experience ||
      filters.max_experience ||
      filters.location ||
      filters.remote_policy ||
      filters.status,
  );
}

export default function DashboardSearchPage() {
  const [queryDraft, setQueryDraft] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("all");
  const [filters, setFilters] = useState<SearchFilters>({
    skills: "",
    min_experience: "",
    max_experience: "",
    location: "",
    remote_policy: "",
    status: "",
    limit: 20,
  });
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSearch = Boolean(activeQuery.trim() || hasActiveFilters(filters));

  const runSearch = useCallback(async (query = activeQuery, type = searchType, nextFilters = filters) => {
    setIsLoading(true);
    setError(null);
    try {
      setResponse(await semanticSearch(type, query, nextFilters));
    } catch {
      setError("Could not run search.");
    } finally {
      setIsLoading(false);
    }
  }, [activeQuery, filters, searchType]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextQuery = queryDraft.trim();
    setActiveQuery(nextQuery);
    runSearch(nextQuery);
  }

  function handleTypeChange(type: SearchType) {
    setSearchType(type);
    runSearch(activeQuery, type);
  }

  function updateFilter<K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function clearFilters() {
    const emptyFilters: SearchFilters = {
      skills: "",
      min_experience: "",
      max_experience: "",
      location: "",
      remote_policy: "",
      status: "",
      limit: 20,
    };
    setFilters(emptyFilters);
    runSearch(activeQuery, searchType, emptyFilters);
  }

  useEffect(() => {
    if (!queryDraft.trim() || queryDraft.trim() === activeQuery) return;
    const timeout = window.setTimeout(() => {
      const nextQuery = queryDraft.trim();
      setActiveQuery(nextQuery);
      runSearch(nextQuery);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [activeQuery, queryDraft, runSearch]);

  const resultCountText = useMemo(() => {
    if (!response) return "";
    return `Found ${response.count} result${response.count === 1 ? "" : "s"} in ${
      response.elapsed_ms
    }ms`;
  }, [response]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Semantic Search</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Search candidates and jobs using semantic relevance plus keyword matching.
        </p>
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-panel">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 lg:flex-row">
          <label className="sr-only" htmlFor="semantic-search">
            Search candidates and jobs
          </label>
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              id="semantic-search"
              value={queryDraft}
              onChange={(event) => setQueryDraft(event.target.value)}
              placeholder="Try senior React developer with healthcare experience"
              className="h-12 w-full rounded-md border border-neutral-200 pl-11 pr-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Search
          </button>
        </form>
      </section>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-panel">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary-600" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-neutral-900">Filters</h2>
            </div>
            {hasActiveFilters(filters) && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-neutral-900"
              >
                <X className="h-3 w-3" aria-hidden="true" />
                Clear
              </button>
            )}
          </div>

          <label className="block">
            <span className="text-xs font-semibold uppercase text-neutral-500">Skills</span>
            <input
              value={filters.skills}
              onChange={(event) => updateFilter("skills", event.target.value)}
              onBlur={() => runSearch()}
              placeholder="Python, React"
              className="mt-1 h-10 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold uppercase text-neutral-500">Min years</span>
              <input
                value={filters.min_experience}
                onChange={(event) => updateFilter("min_experience", event.target.value)}
                onBlur={() => runSearch()}
                inputMode="decimal"
                className="mt-1 h-10 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase text-neutral-500">Max years</span>
              <input
                value={filters.max_experience}
                onChange={(event) => updateFilter("max_experience", event.target.value)}
                onBlur={() => runSearch()}
                inputMode="decimal"
                className="mt-1 h-10 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold uppercase text-neutral-500">Location</span>
            <input
              value={filters.location}
              onChange={(event) => updateFilter("location", event.target.value)}
              onBlur={() => runSearch()}
              placeholder="Remote, Bengaluru"
              className="mt-1 h-10 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase text-neutral-500">Work mode</span>
            <select
              value={filters.remote_policy}
              onChange={(event) => {
                const value = event.target.value as RemotePolicy | "";
                updateFilter("remote_policy", value);
                runSearch(activeQuery, searchType, { ...filters, remote_policy: value });
              }}
              className="mt-1 h-10 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            >
              {REMOTE_OPTIONS.map((option) => (
                <option key={option.value || "any"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase text-neutral-500">Job status</span>
            <select
              value={filters.status}
              onChange={(event) => {
                updateFilter("status", event.target.value);
                runSearch(activeQuery, searchType, { ...filters, status: event.target.value });
              }}
              className="mt-1 h-10 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || "any"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => runSearch()}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            <Filter className="h-4 w-4" aria-hidden="true" />
            Apply filters
          </button>
        </aside>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-panel sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {SEARCH_TYPES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => handleTypeChange(item.value)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                    searchType === item.value
                      ? "bg-primary-600 text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="text-sm text-neutral-500">
              {isLoading ? "Searching..." : resultCountText || "Enter a query to start."}
            </p>
          </div>

          {error && (
            <div className="rounded-md border border-danger-600/20 bg-danger-600/10 px-4 py-3 text-sm text-danger-600">
              {error}
            </div>
          )}

          {!hasSearch && !response ? (
            <div className="rounded-xl border border-dashed border-neutral-200 bg-white px-6 py-16 text-center shadow-panel">
              <Search className="mx-auto h-10 w-10 text-neutral-300" aria-hidden="true" />
              <p className="mt-4 text-sm font-semibold text-neutral-900">
                Search by role, skill, domain, location, or experience.
              </p>
              <p className="mt-1 text-sm text-neutral-500">
                Results combine semantic similarity with exact keyword matches.
              </p>
            </div>
          ) : response && response.results.length === 0 ? (
            <div className="rounded-xl border border-neutral-200 bg-white px-6 py-16 text-center shadow-panel">
              <p className="text-sm font-semibold text-neutral-900">No results found.</p>
              <p className="mt-1 text-sm text-neutral-500">
                Try fewer skills, a broader role title, or a different location.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {response?.results.map((result) => {
                const Icon = resultIcon(result.type);
                return (
                  <Link
                    key={`${result.type}:${result.parsed_resume_id ?? result.id}:${
                      result.application_id ?? result.job_id ?? ""
                    }`}
                    href={result.url}
                    className="block rounded-xl border border-neutral-200 bg-white p-5 shadow-panel transition hover:border-primary-200 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Icon className="h-4 w-4 text-primary-600" aria-hidden="true" />
                          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold uppercase text-neutral-500">
                            {result.type}
                          </span>
                          <h3 className="truncate text-base font-semibold text-neutral-900">
                            {result.title}
                          </h3>
                        </div>
                        <p className="mt-1 text-sm text-neutral-600">{result.subtitle}</p>
                        {result.location && (
                          <p className="mt-2 inline-flex items-center gap-1 text-xs text-neutral-500">
                            <MapPin className="h-3 w-3" aria-hidden="true" />
                            {result.location}
                          </p>
                        )}
                        <p className="mt-3 text-sm text-neutral-600">{result.explanation}</p>
                      </div>
                      <div className="flex shrink-0 flex-row gap-2 sm:flex-col sm:items-end">
                        <span
                          className={`inline-flex h-9 min-w-14 items-center justify-center rounded-full px-3 text-sm font-bold ${scoreClass(
                            result.score,
                          )}`}
                        >
                          {result.score}
                        </span>
                        <span className="text-xs text-neutral-400">
                          {result.semantic_score} semantic / {result.keyword_score} keyword
                        </span>
                      </div>
                    </div>
                    {result.skills.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {result.skills.slice(0, 8).map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
