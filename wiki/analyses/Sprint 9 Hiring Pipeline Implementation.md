---
type: analysis
title: "Sprint 9 Hiring Pipeline Implementation"
analysis_type: framework
date_created: 2026-06-07
date_updated: 2026-06-07
source_count: 5
tags: [product/feature, product/architecture, recruitment/pipeline, kanban, workflow, sprint/complete]
---

# Sprint 9 Hiring Pipeline Implementation

## Methodology

Implemented against the human-managed Sprint 9 plan ([[sprint-09-pipeline]]) and the vault references [[pipeline-schema|Pipeline Schema]], [[pipeline-api|Pipeline API]], and [[pipeline-board|Pipeline Board]]. Work landed in two phases across parallel sessions, then was verified end-to-end as a whole. `raw/` remains immutable; this page records the implemented product state.

## Implementation Summary

Sprint 9 is complete. The product now has a full Kanban hiring pipeline:

**Phase 9A — drag-and-drop on the board (Claude session):**
- Added `@dnd-kit/core`; board cards are draggable between columns with optimistic updates and rollback on failure. An 8px activation distance preserves click-to-open; a keyboard sensor keeps dragging accessible.
- Moves persist through the existing `PATCH /api/v1/applications/{id}/status/` endpoint and are recorded in `ApplicationHistory`.

**Phase 9B — configurable per-job stages (parallel Codex/Antigravity session, verified and closed out here):**
- `PipelineStage` model: **per-job** stages with name, canonical `status` mapping, order, color, terminal flag, `auto_actions` placeholder, and soft-delete (`is_active`). Default 8-stage pipeline (Applied → … → Hired/Rejected) is seeded lazily per job and by migration.
- `PipelineStageHistory`: FK-based stage transition audit (from_stage, to_stage, moved_by, notes, moved_at) recorded **alongside** the existing `ApplicationHistory` status audit.
- `Application.current_stage` FK (indexed); `transition_status(..., stage=)` delegates to the atomic `move_application_to_stage()` service, which keeps `status` and `current_stage` in sync.
- APIs under `/api/v1/pipeline/`: per-job board, stage list/create, update/soft-delete (delete blocked while applications occupy the stage), bulk reorder, and a stage-targeted move. Status-only moves remain supported for the all-jobs board.
- Frontend: the job-filtered board renders **configured** stage columns (names/colors); a "Job stages" panel supports rename, status mapping, recolor, terminal flag, add, remove, and reorder. Drag targets exact stages via `stage_id` (stage-UUID droppable keys avoid duplicate-status collisions).

## Key Decisions

- **Per-job stages, not per-organization.** The session decision was per-org, but the parallel implementation shipped per-job — matching the original sprint task list ("configurable stages per job") and strictly more flexible. Accepted as-is; converting would be rework without product gain. Org-level stage templates can layer on later if duplication becomes a pain.
- **Canonical status mapping retained.** Every stage maps to one of the 8 canonical `Application.Status` values, so the candidate portal, analytics, ranking, and legacy API behavior continue unchanged while recruiters customize the board.
- **Dual history.** Stage moves write both `ApplicationHistory` (status-level, candidate-visible timeline) and `PipelineStageHistory` (stage-level, recruiter analytics) — append-only, with actor and notes.

## Verification

- Migrations applied cleanly (`pipeline/0001–0002`, `candidates/0009`).
- Full backend suite: **66 passed** (includes 4 new pipeline tests: seeding, board labels, move + dual history, reorder).
- Frontend `type-check`, `lint`, and production build pass.
- Real-data smoke: default stages seeded for the live job; board columns and counts correct; a move updated `status` + `current_stage` atomically and recorded both histories; revert restored state.
- Integration seams reviewed: status-or-stage_id serializer validation, all-jobs (status-keyed) vs job-filtered (stage-keyed) drag paths, null `current_stage` on legacy rows, stage-delete guard.

## Deferred / Out of Scope

- Real-time board updates via WebSocket (needs ASGI/Channels) — optimistic UI + refresh for now.
- Optimistic locking for concurrent moves — last-write-wins; revisit with multi-recruiter usage.
- Execution of stage `auto_actions` (emails on stage entry) — field exists, no executor; pairs with [[sprint-13-notifications]].
- Interview feedback tables — belong with [[sprint-12-interview-ai]].
- Time-in-stage on cards and pipeline funnel metrics — [[sprint-14-analytics]].

## Source References

- [[sprint-09-pipeline|Sprint 9 Plan]]
- [[pipeline-schema|Pipeline Schema]]
- [[pipeline-api|Pipeline API]]
- [[pipeline-board|Pipeline Board]]
- [[Sprint 8 Candidate Ranking Implementation]]

## Open Questions

- Should org-level stage *templates* exist so new jobs copy a tuned pipeline instead of the hardcoded default 8?
- Should terminal-stage moves (Hired/Rejected) require confirmation or a reason category in the UI?
- When auto_actions ship, are they recruiter-configurable per stage or fixed per template?
