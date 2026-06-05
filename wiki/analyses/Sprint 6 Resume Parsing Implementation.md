---
type: analysis
title: "Sprint 6 Resume Parsing Implementation"
analysis_type: framework
date_created: 2026-05-31
date_updated: 2026-05-31
source_count: 4
tags: [product/feature, product/architecture, ai/llm, recruitment/screening, resume/parsing, sprint/complete]
---

# Sprint 6 Resume Parsing Implementation

## Methodology

Implemented against the human-managed Sprint 6 plan and related vault references: [[AI Pipeline]], [[Resume Analysis & Data Extraction]], [[Resume Parser]], and [[candidate-api|Candidate API]]. The implementation keeps `raw/` immutable and records the product state in `wiki/`.

## Implementation Summary

Sprint 6 is complete. The product now has an end-to-end parsing foundation:

- Resume upload continues to store files in Supabase Storage and extract raw text asynchronously.
- Text extraction now queues structured parsing instead of marking the resume complete immediately.
- A new `ParsedResume` model stores versioned parsed JSON, parsing status, confidence, parser model, validation errors, token usage, and parse timestamp.
- A Pydantic-validated resume parser sends raw text to the configured Ollama provider using the vault prompt shape.
- Development currently uses [[LLM Provider Architecture|Ollama Cloud]] with `gpt-oss:20b`; local Ollama remains a future option once a local model is installed.
- If the LLM call fails, the parser stores a low-confidence deterministic fallback rather than blocking recruiter review.
- Recruiters can manually trigger `POST /api/v1/resumes/{id}/reparse/`.
- Recruiter and candidate application detail pages display parsed resume summaries, skills, experience, education, confidence, and parsing notes.

## Product Behavior

Candidates remain responsible for uploading resumes in the candidate portal. Recruiters can view/download resumes, inspect parsed data, and request re-parsing when the parsed profile looks stale or low confidence.

The parser does not make hiring decisions and does not score or rank candidates. It only extracts structured data for downstream workflow stages, preserving the [[AI Pipeline]] principle that deterministic systems handle ranking while AI assists with interpretation.

## Completion Status

Sprint 6 is marked complete based on:

- PDF extraction
- DOCX extraction
- raw text storage
- structured parsing
- profile generation
- LLM enhancement
- error recovery
- focused and full backend tests passing
- frontend type-check, lint, and production build passing

## Source References

- [[AI Pipeline]]
- [[LLM Provider Architecture]]
- [[Resume Analysis & Data Extraction]]
- [[Resume Parser]]
- [[candidate-api|Candidate API]]

## Open Questions

- Should low-confidence fallback parses block downstream embedding generation in Sprint 7?
- Should candidates be able to request corrections to parsed data before recruiters use it?
- Should parser costs be stored at organization level for future usage-based billing?
