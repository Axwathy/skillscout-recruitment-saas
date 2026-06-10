---
type: log
title: "Activity Log"
date_created: 2025-05-22
date_updated: 2026-06-05
tags: [wiki/log]
---

# Activity Log

> Chronological record of all wiki operations. Each entry starts with `## [timestamp] operation | title` for easy parsing.

---

## [2026-06-05 20:01] update | CodeRabbit Review Fixes

Addressed CodeRabbit PR review feedback by removing redundant frontend log ignore patterns, consolidating shared frontend parsing status/confidence types, and rewording roadmap status text for readability. Refreshed wiki overview/index/log metadata.

**Pages touched:** [[overview|Overview]], [[index|Wiki Index]], [[log|Activity Log]]

---

## [2026-05-31 02:55] update | Sprint 6 Resume Parsing Implementation

Implemented Sprint 6 resume parsing across backend and frontend, including ParsedResume storage, Celery parsing handoff, Pydantic validation, manual reparse endpoint, parsed-profile display, and focused verification. Filed the implementation summary in the wiki and refreshed roadmap/index metadata.

**Pages touched:** [[Sprint 6 Resume Parsing Implementation]], [[index|Wiki Index]], [[overview|Overview]], [[log|Activity Log]]

---

## [2026-05-31 03:37] update | LLM Provider Architecture and Sprint 6 Completion

Persisted local backend Ollama Cloud settings in ignored environment configuration, documented the current LLM provider architecture in the wiki, and marked Sprint 6 complete based on working PDF/DOCX extraction, structured parsing, LLM enhancement, fallback recovery, and passing tests.

**Pages touched:** [[LLM Provider Architecture]], [[Sprint 6 Resume Parsing Implementation]], [[index|Wiki Index]], [[overview|Overview]], [[log|Activity Log]]

---

## [2026-05-30 16:05] update | Sprint 3 Jobs and Applications Foundation Plan

Filed the Sprint 3 scope as a wiki analysis page, marked Sprint 1, Sprint 2, and Sprint 2.1 complete in the roadmap status, and set Jobs, Applications, and candidate foundation as the next product sprint while keeping AI/resume/pipeline features out of scope.

**Pages touched:** [[Sprint 3 Jobs and Applications Foundation]], [[index|Wiki Index]], [[overview|Overview]], [[log|Activity Log]]

---

## [2026-05-30 15:41] update | Sprint 2.1 Auth Hardening Implementation

Implemented the Sprint 2.1 auth hardening scope: confirm-password registration, scoped auth throttling, silent refresh retry behavior, session-expiration handling, and focused backend auth tests. Verified backend lint, Django checks, migrations, tests, frontend lint/type-check, and frontend production dependency audit.

**Pages touched:** [[Sprint 2.1 Auth Hardening Plan]], [[log|Activity Log]]

---

## [2026-05-30 15:29] update | Sprint 2.1 Auth Hardening Plan

Filed the recommended Sprint 2.1 scope as a wiki analysis page, clarifying that candidate authentication is intentionally out of scope for Sprint 2.1 and that the next work should harden recruiter/admin authentication before Sprint 3.

**Pages touched:** [[Sprint 2.1 Auth Hardening Plan]], [[index|Wiki Index]], [[log|Activity Log]]

---

## [2026-05-30 15:13] update | Sprint 2 Auth and Tenancy Cleanup

Fixed Sprint 2 auth and tenancy implementation issues found after the user's update: cleaned backend lint failures, added post-login navigation, filed the multi-tenant architecture decision in the wiki layer, and refreshed index/overview metadata.

**Pages touched:** [[Multi-Tenant Architecture]], [[index|Wiki Index]], [[overview|Overview]], [[log|Activity Log]]

---

## [2026-05-30 00:40] update | Sprint 1 Foundation Implementation

Implemented the Sprint 1 project foundation as a monorepo scaffold while keeping the human-managed `raw/` sprint plan immutable. Added backend, frontend, Docker Compose, CI, pre-commit, Supabase local config, environment example, README setup docs, and a wiki implementation record.

**Pages touched:** [[Sprint 1 Foundation Implementation]], [[index|Wiki Index]], [[log|Activity Log]]

---

## [2026-05-29 21:09] update | MCP Architecture and Development Tools

Filed the MCP architecture update in the wiki layer, documenting core MCP servers, later-stage MCP servers, newly introduced development tools, Postman's API-testing role, and lifecycle labels for production, experimental, and deprecated formulas. Preserved existing raw architecture and experiment notes, then normalized stale wiki links discovered during the vault check.

**Pages touched:** [[overview|Overview]], [[index|Wiki Index]], [[MCP Ecosystem]], [[MCP Architecture and Development Tools]], [[Obsidian MCP]], [[Filesystem MCP]], [[GitHub MCP]], [[PostgreSQL MCP]], [[Browser MCP]], [[Docker MCP]], [[Supabase MCP]], [[Stitch MCP]], [[Playwright MCP]], [[Ollama]], [[Qwen2.5-Coder 7B]], [[Postman]]

---

## [2026-05-23 01:31] query | Candidate and Recruiter User Perspectives

Synthesized how the AI Recruitment SaaS works from candidate and recruiter perspectives, using the wiki overview plus product feature/API docs for the recruiter workflow. Noted that the current product documentation is recruiter-first and does not yet define a full candidate portal experience.

**Pages touched:** [[overview|Overview]], [[AI Recruitment SaaS Market Landscape 2025]]

---

## [2025-05-22 00:54] init | Wiki Initialized

Initialized the AI Recruitment SaaS LLM Wiki with:
- Created `AGENTS.md` schema (v1.0)
- Created directory structure: `raw/`, `wiki/`, and all subdirectories
- Created `wiki/index.md` — master content catalog
- Created `wiki/log.md` — this activity log
- Created `wiki/overview.md` — high-level synthesis page

**Pages touched:** [[index|Wiki Index]], [[log|Activity Log]], [[overview|Overview]]

---

## [2025-05-22 01:00] ingest | AI Recruitment SaaS Market Landscape 2025

Ingested first source: comprehensive market landscape research on the AI recruitment SaaS market in 2025.

**Source:** `raw/research/ai-recruitment-market-landscape-2025.md`

**Key findings:**
- Market valued at $700M+ (2025), projected $1B+ by early 2030s
- Three market segments: talent intelligence, high-volume automation, structured assessment
- Agentic AI is the defining technology trend
- Skills-based hiring replacing credential-based filtering
- Regulatory compliance (EU AI Act, EEOC) emerging as a competitive moat
- 13 competitors mapped across established and emerging segments

**Pages created (17):**
- Source: [[AI Recruitment SaaS Market Landscape 2025]]
- Entities: [[Eightfold AI]], [[Paradox]], [[HireVue]], [[Phenom]], [[SeekOut]], [[Manatal]], [[Workable]], [[Greenhouse]], [[Gem]], [[Ashby]], [[Findem]], [[Alex.com]], [[Mercor]]
- Concepts: [[Agentic AI in Recruitment]], [[Skills-Based Hiring]], [[AI Hiring Regulations]]

**Pages updated (2):**
- [[index|Wiki Index]], [[overview|Overview]]

---

## [2025-05-22 16:15] structure | Product Documentation Generation

Generated product documentation files mapping out the AI Recruitment SaaS platform across core directories:
- Architecture
- Sprints
- Decisions
- AI Prompts
- Database
- Features
- APIs
- Security
- Deployment
- Backlog
- Experiments
- Research

**Directories touched:** `raw/architecture/`, `raw/sprints/`, `raw/decisions/`, `raw/ai-prompts/`, `raw/database/`, `raw/features/`, `raw/apis/`, `raw/security/`, `raw/deployment/`, `raw/backlog/`, `raw/experiments/`, `raw/research/`

---

## [2026-05-22 16:40] lint | Vault Integrity Cleanup

Resolved the vault health issues found during the audit: added missing entity and decision pages, restored the missing source file reference, normalized wikilinks and API versioning, reconciled embedding/scoring architecture, clarified Supabase auth/storage boundaries, added analytics/project/API support docs, and updated the index. Final consistency pass also aligned job-specific workflows around `candidate_applications` / `application_id` and made the frontend `/api/v1` base path explicit.

**Pages touched:** [[index|Wiki Index]], [[overview|Overview]], [[AI Recruitment SaaS Market Landscape 2025]], [[Alex.com]], [[Mercor]], [[Django as Backend Framework]], [[PostgreSQL with pgvector]], [[Hybrid Ranking System]], [[Supabase as Data Platform]], [[Authentication Strategy]]

---

## [2026-05-22 17:25] update | AI Responsibility Standardization

Standardized the production AI architecture around `BAAI/bge-small-en-v1.5` for embeddings, deterministic hybrid scoring for ranking, and Qwen2.5-Coder:7B via Ollama as the primary LLM for summaries, explanations, recruiter insights, resume analysis, and interview generation. Added the central AI responsibility split, marked ranking/prompt experiments as experimental rather than production behavior, and redacted a plaintext API key note into a secret-management placeholder.

**Pages touched:** `raw/architecture/ai-responsibilities.md`, `raw/architecture/ai-pipeline.md`, `raw/architecture/tech-stack.md`, `raw/architecture/mcp-context.md`, `raw/ai-prompts/candidate-scoring.md`, `raw/experiments/ranking-formula-tests.md`, `raw/experiments/prompt-experiments.md`

---

## [2026-05-29 23:02] update | Lumina Nexus UI UX Foundation

Created the complete Lumina Nexus UI/UX foundation for the recruiter and candidate portals, including design tokens, typography, spacing, component library, navigation architecture, and requested wireframe/layout sections. Added concept pages for the Lumina Nexus design direction and referenced product features, then updated the wiki index.

**Pages touched:** [[Lumina Nexus UI UX Foundation]], [[Lumina Nexus]], [[Candidate Dashboard]], [[Pipeline Board]], [[Semantic Search]], [[overview]], [[index]], [[log]]

---

## [2026-05-30 01:09] update | Lumina Nexus — Clarification as Design Theme

Corrected a misclassification: **Lumina Nexus is a color/design theme, not the product name.** The product is currently using **RecruitAI** as a placeholder name in the UI until an official product name is decided.

Changes made:
- Updated `wiki/concepts/Lumina Nexus.md` — added clarification notice, reframed definition as a design/color system, not a product brand.
- Updated `wiki/overview.md` — corrected the Product Experience section to distinguish Lumina Nexus (theme) from RecruitAI (product name placeholder).
- Updated all frontend files (`app/layout.tsx`, `app/(public)/layout.tsx`, `app/(public)/page.tsx`, `app/(public)/login/page.tsx`, `app/(public)/register/page.tsx`, `app/(dashboard)/layout.tsx`, `app/(dashboard)/dashboard/page.tsx`) — replaced "Lumina Nexus" brand references with "RecruitAI".

**Pages touched:** [[Lumina Nexus]], [[overview|Overview]], [[log|Activity Log]]

---

## [2026-06-06 02:30] update | Activated Real Semantic Embeddings

Switched the embedding pipeline from the `local_hashing` placeholder to real semantic embeddings using `BAAI/bge-small-en-v1.5` via the `sentence_transformers` provider (default in `settings/base.py`). The placeholder hashed tokens into a sparse vector, so the 0.45-weighted `semantic_score` was effectively keyword overlap; it now captures conceptual meaning (e.g. "cloud infrastructure" ≈ "AWS"). Verified end-to-end: 384-dim normalized vectors, relevant candidate cosine 0.78 vs irrelevant 0.50. Re-embedded existing data (1 job, 4 parsed resumes) and re-scored applications (final scores moved ~61-68% -> 85-88%). All 45 backend tests pass.

**Notes:** `ollama` provider remains available via `EMBEDDING_PROVIDER=ollama` for cloud embeddings. Backend runtime uses `.venv-codex` (the `.venv` dir is stale, created on another machine). `requirements.txt` now includes `sentence-transformers>=3.0.0` (pulls torch).

**Files touched:** `backend/config/settings/base.py`, `backend/apps/ai_engine/embeddings.py`, `backend/requirements.txt`, `backend/.env.example`

---

## [2026-06-06 03:30] fix | Resume Parsing: Primary LLM + Null-Tolerant Validation

Fixed why resume parsing never used the primary LLM and kept falling back to the secondary model / deterministic heuristic. Two independent root causes:

1. **Primary model was broken on the endpoint.** `gpt-oss:20b` on Ollama Cloud (`https://ollama.com`) returns HTTP 200 with token counts but an **empty** `response`/`thinking` field for every config (generate/chat, format=json or not, think true/false) — its harmony-channel output is dropped server-side. (`gpt-oss:120b` works; `gpt-oss:20b` does not.) Switched the primary to **`qwen3-coder:480b`** (fastest + reliable JSON in testing, ~6s end-to-end), fallback chain `gemma3:12b,gemma3:4b`.
2. **Validation discarded good parses.** Non-optional `str` fields (e.g. `Language.proficiency`, `Experience.role`, `Education.institution`) raised `ValidationError` when the LLM emitted `null` for a sub-field the resume omits. A single null anywhere forced the whole parse to fall through. Added a base-model `mode=before` validator that coerces `null` → field default for required strings. This bug would have sabotaged *any* model.

Also fixed two accuracy quirks surfaced during verification: duplicate education rows (heuristic partial entry now merges into the LLM entry by year) and an over-restrictive language whitelist (added Marathi, Bengali, Gujarati, and many world/Indian languages).

Verified end-to-end (DOCX → extract → parse) using the live `qwen3-coder:480b`: high confidence, zero validation errors, complete extraction. Added 2 regression tests; full backend suite 58 passed.

**Files touched:** `backend/apps/candidates/resume_parser.py`, `backend/apps/candidates/tests/test_resume_parser.py`, `backend/config/settings/base.py`, `backend/.env`, `backend/.env.example`

---

## [2026-06-06 21:30] analysis | Sprint 8 Candidate Ranking — Implementation Review

Researched the vault (Sprint 8 plan, Sprint 7, AI Responsibilities, Hybrid Ranking System, Semantic Matching, Candidate API) against the actual codebase and filed a new analysis. **Key finding: Sprint 8 (Candidate Ranking Engine) is functionally delivered** — the hybrid 45/30/25 formula, alias-aware skill matching, real timeline-based experience scoring, the `GET /jobs/{id}/ranked-candidates/` endpoint (full breakdown + matched/missing skills), and the recruiter-facing breakdown UI (job + application pages) all exist and pass tests. The earlier "matched/missing skills die before the frontend" gap is resolved.

Recommended continuation (does not rebuild what exists, preserves "Math decides. AI explains."): (1) reconcile docs incl. `candidate-api.md` to the live contract; (2) harden the scoring path — Celery `batch_score_applications` + serve cached `Application` scores, recompute only when stale/forced, add `min_score`/`skills_met` filters; (3) surface `missing_skills` in the UI; (4) keep the LLM explanation layer deferred to Phase 4 with a nullable seam; (5) keep scores on `Application` (defer a dedicated `CandidateScore` history table). Recommend closing Sprint 8 and proceeding to Sprint 9 (Hiring Pipeline).

**Pages touched:** [[Sprint 8 Candidate Ranking Implementation]], [[index|Wiki Index]], [[log|Activity Log]]

---

## [2026-06-06 22:15] feature | Sprint 8 Close-Out — Candidate Ranking Hardening

Implemented the approved Sprint 8 hardening (deterministic only; LLM explanation layer remains deferred to Phase 4):

- **Read-only ranked GET.** Split `ranking.py` `score_application` into `build_candidate_score` (pure compute, no DB write) + `persist_application_scores`; `rank_candidates_for_job` is now read-only by default. Viewing rankings no longer mutates `Application` rows (previously every GET recomputed and wrote all four score fields).
- **Event-driven batch scoring.** New Celery task `batch_score_applications(job_id)`; enqueued on job create/update (`jobs/views.py: enqueue_batch_score`) after embedding. Parse-time scoring unchanged.
- **Ranked filters.** `RankedCandidatesView` now supports `min_score` and `skills_met` query params; applied filters echoed in the response.
- **UI completes the "why".** Job ranked list now renders each candidate's `missing_skills` as chips (data already in the API).

Verification: 62 backend tests pass (+4 new: read-only GET, batch persistence, min_score + skills_met filters); ruff clean; frontend type-check, lint, and production build pass. `raw/` left immutable per vault convention.

**Files touched:** `backend/apps/ai_engine/ranking.py`, `backend/apps/ai_engine/tasks.py`, `backend/apps/jobs/views.py`, `backend/apps/ai_engine/tests.py`, `frontend/app/(dashboard)/dashboard/jobs/[id]/page.tsx`
**Pages touched:** [[Sprint 8 Candidate Ranking Implementation]], [[log|Activity Log]]

---

## [2026-06-06 23:10] feature | Sprint 9 Phase 9A — Drag-and-Drop Pipeline

Implemented Phase 9A of Sprint 9 (Hiring Pipeline). Decision (with user): **phased** — ship drag-and-drop on the existing fixed 8-status enum now (no data migration); defer configurable **per-organization** stages to Phase 9B.

Research showed most of the pipeline already existed: the Kanban board, the `updateApplicationStatus()` client fn, the move endpoint (`PATCH /applications/{id}/status/` → records `ApplicationHistory` via `transition_status`), and the status-history timeline UI on the application detail page. The only gap was the drag interaction.

Changes (frontend only — no backend changes needed): added `@dnd-kit/core`; rebuilt `dashboard/pipeline/page.tsx` with `DndContext` (PointerSensor with an 8px activation distance so a plain click still navigates; KeyboardSensor for a11y), droppable columns, draggable cards, and an **optimistic** move that calls the existing status endpoint and rolls back on error. Column counts update live.

Verification: frontend type-check, lint, and production build pass; backend candidates tests (status update + history) green. Phase 9B (per-org `PipelineStage` model + migration + config panel) documented as the next chunk; WebSockets, auto-actions, interview feedback, and time-in-stage remain out of scope.

**Files touched:** `frontend/app/(dashboard)/dashboard/pipeline/page.tsx`, `frontend/package.json`
**Pages touched:** [[log|Activity Log]]

---

## [2026-06-07 22:30] feature | Sprint 9 Complete — Hiring Pipeline (9A + 9B Verified)

Closed out Sprint 9. Phase 9A (drag-and-drop Kanban, Claude session) shipped earlier; Phase 9B (configurable per-job stages) was implemented end-to-end by a parallel Codex/Antigravity session and has now been **verified, smoked, and documented** here.

9B delivers: `PipelineStage` (per-job, status-mapped, ordered, colored, terminal flag, soft-delete) with lazy + migration seeding of the default 8 stages; `PipelineStageHistory` dual audit alongside `ApplicationHistory`; `Application.current_stage` FK kept in sync atomically by `move_application_to_stage()`; APIs for board/stage CRUD/reorder/move under `/api/v1/pipeline/`; and a stage-aware board UI with a full "Job stages" management panel (rename, status mapping, recolor, terminal, add, remove, reorder). Stage-UUID droppable keys give exact-stage drag targeting; the all-jobs board keeps status-keyed fallback.

Decision recorded: stages are **per-job** (matches the sprint task list; more flexible than the per-org schema doc) with canonical status mapping preserving candidate portal/analytics/ranking behavior.

Verification: migrations clean; full backend suite **66 passed** (4 new pipeline tests); frontend type-check/lint/build pass; real-data smoke confirmed seeding, board counts, atomic move with dual history, and revert. Deferred: WebSockets, optimistic locking, auto_actions execution, interview feedback, funnel analytics.

**Pages touched:** [[Sprint 9 Hiring Pipeline Implementation]], [[index|Wiki Index]], [[log|Activity Log]]
