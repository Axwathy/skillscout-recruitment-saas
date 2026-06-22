"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Mail, RefreshCcw, Search, Trash2, UserRound, X } from "lucide-react";

import { deleteCandidate, getRecruiterCandidates } from "@/lib/candidate";
import type { CandidateRecord } from "@/types/candidate";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function candidateName(candidate: CandidateRecord) {
  return `${candidate.first_name} ${candidate.last_name}`.trim() || candidate.email;
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  async function loadCandidates(search = activeSearch) {
    setIsLoading(true);
    setError(null);
    try {
      setCandidates(await getRecruiterCandidates(search));
    } catch {
      setError("Could not load candidates.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    const nextSearch = searchDraft.trim();
    setActiveSearch(nextSearch);
    loadCandidates(nextSearch);
  }

  function clearSearch() {
    setSearchDraft("");
    setActiveSearch("");
    loadCandidates("");
  }

  async function handleDelete(candidate: CandidateRecord) {
    const confirmed = window.confirm(
      `Delete ${candidateName(candidate)}? This permanently removes the candidate and their applications, resumes, and notes. This cannot be undone.`,
    );
    if (!confirmed) return;
    try {
      await deleteCandidate(candidate.id);
      setCandidates((current) => current.filter((item) => item.id !== candidate.id));
    } catch {
      setError("Could not delete that candidate.");
    }
  }

  useEffect(() => {
    let ignore = false;

    async function fetchCandidates() {
      try {
        const response = await getRecruiterCandidates();
        if (!ignore) setCandidates(response);
      } catch {
        if (!ignore) setError("Could not load candidates.");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    fetchCandidates();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Candidates</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Review candidate profiles, notes, resumes, scores, and activity.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearch} className="flex min-w-0 flex-1 sm:w-96">
            <label className="sr-only" htmlFor="candidate-search">
              Search candidates
            </label>
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                aria-hidden="true"
              />
              <input
                id="candidate-search"
                type="search"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Search name, email, or phone"
                className="h-10 w-full rounded-l-md border border-r-0 border-neutral-200 bg-white pl-9 pr-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-r-md bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Search
            </button>
          </form>
          {activeSearch && (
            <button
              type="button"
              onClick={clearSearch}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => loadCandidates()}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {activeSearch && (
        <div className="rounded-md border border-primary-100 bg-primary-50 px-4 py-2 text-sm text-primary-700">
          Showing candidates matching "{activeSearch}".
        </div>
      )}

      {error && (
        <div className="rounded-md border border-danger-600/20 bg-danger-600/10 px-4 py-3 text-sm text-danger-600">
          {error}
        </div>
      )}

      <div className="glass-panel overflow-x-auto rounded-lg">
        <table className="min-w-full divide-y divide-neutral-200/70">
          <thead className="bg-white/40">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-neutral-500">
                Candidate
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-neutral-500">
                Contact
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-neutral-500">
                Resumes
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-neutral-500">
                Added
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-neutral-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200/70">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-neutral-500">
                  Loading candidates...
                </td>
              </tr>
            ) : candidates.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-neutral-500">
                  {activeSearch ? "No candidates match your search." : "No candidates found."}
                </td>
              </tr>
            ) : (
              candidates.map((candidate) => (
                <tr key={candidate.id}>
                  <td className="px-4 py-4">
                    <Link
                      href={`/dashboard/candidates/${candidate.id}`}
                      className="inline-flex items-center gap-2 font-medium text-primary-600 hover:text-primary-700"
                    >
                      <UserRound className="h-4 w-4" aria-hidden="true" />
                      {candidateName(candidate)}
                    </Link>
                  </td>
                  <td className="px-4 py-4">
                    <a
                      href={`mailto:${candidate.email}`}
                      className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-primary-600"
                    >
                      <Mail className="h-4 w-4" aria-hidden="true" />
                      {candidate.email}
                    </a>
                    {candidate.phone && (
                      <div className="mt-1 text-sm text-neutral-500">{candidate.phone}</div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-neutral-700">
                    {candidate.resumes?.length ?? 0}
                  </td>
                  <td className="px-4 py-4 text-sm text-neutral-700">
                    {formatDate(candidate.created_at)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(candidate)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-danger-600/30 text-danger-600 transition-colors hover:bg-danger-50"
                      title="Delete candidate"
                      aria-label={`Delete ${candidateName(candidate)}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
