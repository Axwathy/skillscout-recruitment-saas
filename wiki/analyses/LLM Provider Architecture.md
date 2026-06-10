---
type: analysis
title: "LLM Provider Architecture"
analysis_type: framework
date_created: 2026-05-31
date_updated: 2026-05-31
source_count: 3
tags: [product/architecture, ai/llm, resume/parsing, product/operations]
---

# LLM Provider Architecture

## Methodology

This page records the observed implementation state after Sprint 6 validation, cross-checked against [[AI Pipeline]], [[Resume Analysis & Data Extraction]], and [[Sprint 6 Resume Parsing Implementation]]. It is filed in `wiki/` because `raw/` remains human-managed and immutable.

## Current Provider

Primary LLM provider for development is **Ollama Cloud**.

| Concern | Current setting |
|---|---|
| Provider | Ollama Cloud |
| Base URL | `https://ollama.com` |
| Model | `gpt-oss:20b` |
| Auth | `OLLAMA_API_KEY` server-side environment variable |
| Use case | Resume structured extraction / LLM enhancement |

Local Ollama is installed and reachable at `http://localhost:11434`, but no local models are currently installed. Because of that, local-only parsing would fall back to deterministic extraction unless a model is pulled.

## Future Local Option

Local Ollama remains the preferred future/offline provider option.

| Concern | Target setting |
|---|---|
| Provider | Local Ollama |
| Base URL | `http://localhost:11434` |
| Candidate model | `qwen2.5-coder:7b` |
| Reason | Lower data exposure, offline development, predictable local architecture |

## Parser Resilience

The resume parsing path should stay resilient:

```text
Resume Upload
-> Text Extraction
-> Heuristic Parser
-> LLM Enhancement
-> Structured Profile
```

LLM failure should not block recruiter review. The parser stores low-confidence deterministic fallback data when LLM access fails, then LLM enhancement can improve the structured profile when a provider is available.

## Operational Notes

- `backend/.env` stores local provider settings and is ignored by Git.
- `.env.example` documents the required variable names without secrets.
- If backend is restarted from a new shell, `backend/.env` is loaded by Django settings.
- Docker should mount/read `backend/.env` through the backend app volume, so the same provider settings apply there unless overridden by container environment variables.

## Source References

- [[AI Pipeline]]
- [[Resume Analysis & Data Extraction]]
- [[Sprint 6 Resume Parsing Implementation]]

## Open Questions

- Should production use Ollama Cloud, a private hosted model endpoint, or local GPU-backed Ollama?
- Should provider selection be organization-scoped or environment-scoped?
- Should parser confidence determine whether Sprint 7 embeddings are generated automatically?
