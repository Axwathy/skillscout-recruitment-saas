---
type: analysis
title: "Sprint 8 Candidate Ranking Implementation"
analysis_type: framework
date_created: 2026-06-06
date_updated: 2026-06-06
source_count: 6
tags: [product/feature, product/architecture, ai/embeddings, ai/scoring, recruitment/screening, ranking, sprint/complete]
---

# Sprint 8 Candidate Ranking Implementation

## Methodology

Analysed the human-managed Sprint 8 plan ([[sprint-08-candidate-ranking]]) against the **actual codebase state** and the production architecture in [[AI Responsibilities]], [[Hybrid Ranking System]], and [[semantic-matching|Semantic Matching]]. Following project convention, `raw/` is treated as immutable (the original plan is preserved as written) and the implemented product state is recorded here in `wiki/`.

Code reviewed: `apps/ai_engine/ranking.py`, `apps/ai_engine/embeddings.py`, `apps/ai_engine/experience_timeline.py`, `apps/jobs/views.py` (`RankedCandidatesView`, `SimilarCandidatesView`), `apps/candidates/models.py` (`Application` score fields), and the frontend pages `dashboard/jobs/[id]`, `dashboard/applications/[id]`, plus `lib/scores.ts` and `lib/jobs.ts`.

## Key Finding — Sprint 8 is Functionally Delivered

The Sprint 8 plan was written before the engine existed and assumes a greenfield build (a new `CandidateScore` model, a `ScoringService`, a brand-new ranked endpoint). In reality, the candidate ranking engine **is already implemented end-to-end** — backend math, API, and frontend. The earlier concern that "matched/missing skills are computed then thrown away before reaching the frontend" is **resolved**: that data now flows all the way to the recruiter UI.

The single highest-impact prerequisite was also completed ahead of this analysis: the embedding provider was switched from the `local_hashing` placeholder to real semantic embeddings (`BAAI/bge-small-en-v1.5` via `sentence_transformers`), so the 0.45 semantic weight now measures meaning rather than keyword overlap. See [[Embedding Provider Activation]] context in [[log|Activity Log]].

## Implementation Summary — What Exists Today

**Deterministic scoring (the math):**
- Hybrid formula `0.45·semantic + 0.30·skill + 0.25·experience`, matching [[AI Responsibilities]] exactly (`ranking.py: SCORE_VERSION = "hybrid-v1"`).
- Semantic similarity from stored pgvector embeddings (cosine), now real BGE embeddings.
- Skill matching with alias/synonym resolution via `KNOWN_SKILLS` (e.g. `K8s → kubernetes`, `RoR → rubyonrails`), returning `matched_skills` / `missing_skills`.
- Experience relevance from a real timeline computation (`experience_timeline.py`) with overlap handling, falling back to LLM-provided metadata then regex.
- Scores persisted on `Application` (`semantic_score`, `skill_score`, `experience_score`, `final_score`, `score_version`, `score_calculated_at`) with a DB index on `(organization, job, final_score)` for fast ordering.

**API:**
- `GET /api/v1/jobs/{id}/ranked-candidates/` — returns rank-ordered candidates with overall score, per-dimension breakdown (percent + normalized), `matched_skills`, `missing_skills`, `job_skills`, `candidate_skills`, required/candidate experience years, `score_version`, and `score_calculated_at`. Audit-logged.
- `GET /api/v1/jobs/{id}/similar-candidates/` — pgvector cosine nearest-neighbour search.

**Frontend:**
- Job detail page renders a **Ranked candidates** section with per-candidate breakdown bars (Semantic / Skills / Experience) and matched-skill counts, with a "Refresh ranking" action.
- Application detail page shows a **Match score** panel (overall + sub-scores) with a "Refresh scores" action.
- `lib/scores.ts` provides consistent score formatting/tone/bar helpers.

**Quality:** Focused `ai_engine` scoring tests plus the full backend suite pass.

This satisfies the [[AI Responsibilities]] mandate that the deterministic engine "must expose sub-scores for recruiter review" and that ranking stays auditable and version-stamped.

## Gap Analysis — Plan vs. Reality

| Sprint 8 planned item | Status | Notes |
|---|---|---|
| Hybrid formula 45/30/25 | ✅ Done | `ranking.py`, version `hybrid-v1` |
| Semantic similarity (pgvector) | ✅ Done | Real BGE embeddings now active |
| Skill matching + synonyms | ✅ Done | `KNOWN_SKILLS` alias resolution |
| Experience relevance scorer | ✅ Done | `experience_timeline.py` |
| Ranked-candidates endpoint | ✅ Done | Richer than planned (full breakdown) |
| Sub-score breakdown in UI | ✅ Done | Job + application pages |
| Scoring tests | ✅ Done | Suite passing |
| `CandidateScore` Django model | ⚠️ Different | Scores live on `Application` + in-memory dataclass; no separate history table |
| Batch scoring Celery task | ⚠️ Partial | Scored at parse time; recomputed on every rank request; no `batch_score_applications` on job update |
| Score caching + invalidation | ❌ Missing | No Redis cache; rank endpoint recomputes **and writes** on every GET |
| Result filtering (min score / skills-met) | ❌ Missing | Endpoint has `limit` and `force` only |
| Confidence indicator for low scores | ❌ Missing | Not surfaced |
| `missing_skills` shown in UI | ⚠️ Partial | In API; job list shows matched count, not the missing list |
| AI-generated match explanations | ⏸️ Deferred | Correctly deferred to Phase 4 (see below) |

Documentation drift to reconcile: `raw/apis/candidate-api.md` documents a candidate-centric `…/scores/` endpoint "with LLM-generated explanations," but the implemented endpoint is the job-centric `…/ranked-candidates/` with **no** LLM explanation. The implemented shape is the source of truth.

## Recommended Continuation — "Correct and Perfect" Path

The right move is **not to rebuild** what exists, but to close Sprint 8 cleanly and harden it, while keeping the AI-explanation layer deferred — consistent with **"Math decides. AI explains."**

1. **Close & reconcile (docs only):** record implemented reality (this page), and update `raw/apis/candidate-api.md` to match the live `ranked-candidates` contract.
2. **Harden the scoring path (deterministic — no principle risk):**
   - Add a Celery `batch_score_applications(job_id)` task triggered on job create/update (after embedding) to keep the existing parse-time scoring.
   - Make the rank endpoint **serve cached `Application` scores by default**, recomputing only when stale (`score_version` mismatch, embedding regenerated, or `force=true`). Stop the recompute-and-write on every GET. Redis can come later; the `Application` row + index is sufficient caching for now.
   - Add `min_score` and `skills_met` filters to the ranked endpoint.
3. **Finish the explainability UI (still math-only):** surface `missing_skills` in the job ranked list and application panel (e.g. "matched 4/6 · missing: Kubernetes, Terraform"). Zero new backend — the data is already returned.
4. **Defer the LLM explanation layer to Phase 4 / a later sprint** (post-validation with real recruiters), as originally advised. Prepare the seam now: a nullable `match_explanation` field and a null `explanation` key in the API response, generated **on-demand** (not batch) when built, so the LLM never touches scores or ordering.
5. **`CandidateScore` model decision:** keep scores on `Application` for now (simpler, indexed, sufficient). Revisit a dedicated score-history table only when audit history or formula A/B testing is needed — track as [[technical-debt|Technical Debt]].

## Product Behavior

Recruiters open a job and see candidates ranked 0–100 with a transparent breakdown of semantic, skill, and experience fit plus the specific skills matched. Scoring is deterministic, version-stamped, and auditable; no AI alters scores or ordering. Re-ranking is recruiter-triggered today and should become event-driven (batch task) per the continuation plan.

## Completion Status

Sprint 8 (Candidate Ranking Engine) is **functionally complete** for its core goal — hybrid scoring with recruiter-visible sub-score breakdowns. Remaining items are hardening (caching/batch/filtering), a small UI completion (`missing_skills`), and the intentionally deferred Phase 4 explanation layer. Recommend marking Sprint 8 complete with the hardening items carried as scoped follow-ups, then proceeding to [[sprint-09-pipeline|Sprint 9 — Hiring Pipeline]].

## Source References

- [[sprint-08-candidate-ranking|Sprint 8 Plan]]
- [[sprint-07-embeddings|Sprint 7 — Embeddings]]
- [[AI Responsibilities]]
- [[Hybrid Ranking System]]
- [[semantic-matching|Semantic Matching]]
- [[candidate-api|Candidate API]]

## Open Questions

- Should re-scoring be fully event-driven (job update → batch) or remain recruiter-triggered with caching? (Recommendation: event-driven + cached.)
- When the Phase 4 explanation layer ships, is it on-demand per candidate (cost control) or precomputed for the top N?
- Does a dedicated `CandidateScore` history table earn its keep before formula A/B testing exists?
- Should low-confidence scores (sparse skills/experience) be visually flagged for human review?
