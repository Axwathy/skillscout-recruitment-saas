---
type: overview
title: "AI Recruitment SaaS — Knowledge Base Overview"
date_created: 2025-05-22
date_updated: 2026-05-31
source_count: 1
tags: [product/strategy, market/trend, ai/llm]
---

# AI Recruitment SaaS — Overview

> This page is the front door to the knowledge base. It provides a high-level synthesis that evolves as sources are ingested and analyses are filed.

## Vision

We are building an **AI-powered recruitment SaaS** platform. This wiki is our persistent, compounding knowledge base — tracking the competitive landscape, underlying technologies, market dynamics, regulatory environment, and our own product decisions.

## What We Know So Far

### Competitive Landscape

*Based on 1 source — [[AI Recruitment SaaS Market Landscape 2025]]*

The market is valued at **$700M+ (2025)** and projected to exceed **$1B by the early 2030s**. We've mapped **13 competitors** across four primary segments plus an emerging autonomous-interview lane:

| Segment | Key Players | Target Market |
|---------|-------------|---------------|
| **Talent Intelligence** | [[Eightfold AI]], [[Phenom]], [[SeekOut]], [[Findem]] | Enterprise |
| **High-Volume Automation** | [[Paradox]], [[Gem]] | Enterprise / mid-market |
| **Assessment & Compliance** | [[HireVue]] | Enterprise (regulated) |
| **ATS / All-in-One** | [[Greenhouse]], [[Workable]], [[Manatal]], [[Ashby]] | Mid-market to SMB |
| **Emerging / Autonomous** | [[Alex.com]], [[Mercor]] | Early / unclear |

**Key insight:** Most players focus on one of these segments. Few do all three well — this is a potential whitespace opportunity.

### Technology Landscape

Three technology trends are reshaping the market:

1. **[[Agentic AI in Recruitment]]** — The shift from chatbots to autonomous agents that handle multi-step workflows (sourcing → screening → scheduling → assessment). This is the defining trend of 2025.

2. **[[Skills-Based Hiring]]** — AI-driven skills inference replacing degree-based filtering. Enables better matching and diversity outcomes.

3. **[[AI Hiring Regulations]]** — EU AI Act, NYC Local Law 144, and EEOC guidance are making compliance a competitive moat, not just a checkbox.

### Development Workflow and Tooling

The project now documents [[MCP Ecosystem]] as the AI-native development context layer. Core MCP servers are [[Obsidian MCP]], [[Filesystem MCP]], [[GitHub MCP]], [[PostgreSQL MCP]], and [[Browser MCP]]. Later-stage MCP extensions are [[Docker MCP]], [[Supabase MCP]], [[Stitch MCP]], and [[Playwright MCP]].

Newly documented development tools are [[Ollama]], [[Qwen2.5-Coder 7B|Qwen2.5-Coder:7B]], [[Postman]], and the broader [[MCP Ecosystem]]. Postman is specifically for API testing, authentication testing, API collections, and endpoint debugging. See [[MCP Architecture and Development Tools]] for the full filed update.

### Market Dynamics

- Enterprise is well-served by [[Eightfold AI]], [[HireVue]], [[Paradox]]
- SMB/mid-market is underserved by deep AI — mostly getting AI-lite features bolted onto traditional ATS
- ATS is commoditizing — differentiation is moving to intelligence, automation, and compliance layers

### Regulatory Environment

AI hiring is classified as **high-risk** under the EU AI Act. Key requirements include bias audits, explainability, and human oversight. [[HireVue]]'s pivot away from facial analysis shows the reputational risk of non-compliance.

### Product Decisions

Initial architecture decisions are now documented:

- [[Django as Backend Framework]]
- [[PostgreSQL with pgvector]]
- [[Hybrid Ranking System]]
- [[Supabase as Data Platform]]
- [[Authentication Strategy]]
- [[Multi-Tenant Architecture]]

### Product Experience

The product now has a filed UI/UX foundation: [[Lumina Nexus UI UX Foundation]]. **Lumina Nexus is a color/design theme** — not the product name. The product is currently referred to as **RecruitAI** (placeholder name) in the UI until an official name is decided. The Lumina Nexus theme defines a professional, data-focused enterprise SaaS interface across two portals: a desktop-optimized recruiter portal and a mobile-friendly candidate portal. It preserves the core AI rule from [[Hybrid Ranking System]]: deterministic math controls scores and ranking, while the LLM explains results, summarizes evidence, and generates recruiter-assistive content.

### Roadmap Status

- Sprint 1 is complete: foundation and developer workflow are in place via [[Sprint 1 Foundation Implementation]].
- Sprint 2 is complete: recruiter/admin authentication, organization approval, and RBAC are in place.
- Sprint 2.1 is complete: auth hardening is implemented via [[Sprint 2.1 Auth Hardening Plan]].
- Sprint 3 established the product workflow through Jobs, Applications, and candidate records via [[Sprint 3 Jobs and Applications Foundation]].
- Sprint 6 is complete: [[Sprint 6 Resume Parsing Implementation]] adds the resume parsing foundation with text extraction handoff, Pydantic-validated structured JSON, manual re-parsing, confidence metadata, and parsed-profile display in recruiter/candidate application views.
- The current development LLM provider is [[LLM Provider Architecture|Ollama Cloud]] using `gpt-oss:20b`; local Ollama is installed but has no local models yet, so `qwen2.5-coder:7b` remains a future local option.

Open strategic decisions remain: target segment, pricing model, integration strategy, and the first agentic workflow to automate.

## Emerging Themes

1. **Agentic architecture as differentiator** — Building agent-native (not bolt-on AI) could set us apart from legacy ATS
2. **Compliance as moat** — Investing in explainability and bias auditing early creates defensibility
3. **SMB whitespace** — Enterprise is crowded; SMB/mid-market lacks deep AI tools
4. **Skills-based matching** — LLMs could unlock new approaches to skills inference from unstructured data

## Key Questions to Investigate

1. ~~Who are the top competitors and what are their strengths/weaknesses?~~ ✅ **Initial mapping done** (13 competitors)
2. **What AI capabilities** are table stakes vs. differentiators in recruitment?
3. **What regulations** constrain AI use in hiring, and how do they vary by market?
4. **Who is the ideal customer** — SMB, mid-market, or enterprise?
5. **What integrations** are must-haves (ATS, HRIS, job boards)?
6. **What's the pricing model** landscape — per-seat, per-hire, usage-based?
7. **What is the actual adoption rate** of agentic AI — hype vs. reality?

---

> **Next steps:** Deep-dive into specific competitors. Drop competitor pages, product reviews, or pricing pages into `raw/` and say "ingest" to build out entity pages. Or ask a question — e.g., "Compare Eightfold AI vs Paradox for mid-market buyers."
