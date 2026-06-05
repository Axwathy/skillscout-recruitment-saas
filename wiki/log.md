---
type: log
title: "Activity Log"
date_created: 2025-05-22
date_updated: 2026-05-31
tags: [wiki/log]
---

# Activity Log

> Chronological record of all wiki operations. Each entry starts with `## [timestamp] operation | title` for easy parsing.

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
