import { apiFetch } from "@/lib/api";
import type { SearchFilters, SearchResponse, SearchType } from "@/types/search";

export async function semanticSearch(
  type: SearchType,
  query: string,
  filters: SearchFilters = {},
): Promise<SearchResponse> {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (filters.skills?.trim()) params.set("skills", filters.skills.trim());
  if (filters.min_experience?.trim()) {
    params.set("min_experience", filters.min_experience.trim());
  }
  if (filters.max_experience?.trim()) {
    params.set("max_experience", filters.max_experience.trim());
  }
  if (filters.location?.trim()) params.set("location", filters.location.trim());
  if (filters.remote_policy) params.set("remote_policy", filters.remote_policy);
  if (filters.status) params.set("status", filters.status);
  if (filters.limit) params.set("limit", String(filters.limit));

  const suffix = params.toString() ? `?${params.toString()}` : "";
  const endpoint =
    type === "all" ? "/api/v1/search/" : `/api/v1/search/${type}/`;
  return apiFetch<SearchResponse>(`${endpoint}${suffix}`, { method: "GET" });
}
