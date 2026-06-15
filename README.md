# SkillScout — AI Recruitment SaaS

> **Math ranks. AI explains. You decide.**

SkillScout is an AI-assisted enterprise recruitment platform. It ingests resumes, ranks candidates against a job with transparent scoring, and uses a locally-served LLM to *explain* every ranking in plain language — so recruiters stay in control of the final call. It ships with two portals: a full recruiter dashboard and a candidate-facing application portal.

---

## Highlights

- **Transparent AI ranking** — deterministic scoring math produces the ranking; the LLM generates a human-readable explanation for *why* each candidate scored the way they did. No black-box decisions.
- **Semantic candidate search** — vector embeddings (pgvector + `bge-small-en-v1.5`) let recruiters search talent by meaning, not just keywords.
- **Automated resume parsing** — PDF and DOCX resumes are parsed into structured profiles (skills, experience timeline, education).
- **AI interview preparation** — generates tailored interview questions and prep material per candidate/role.
- **Batch processing** — upload and screen large candidate sets in the background via Celery.
- **Visual hiring pipeline** — drag-and-drop kanban to move candidates through stages.
- **Analytics dashboard** — funnel, time-to-hire, and pipeline metrics.
- **Real-time notifications** — in-app updates over WebSockets (Django Channels).
- **Dual portals** — recruiter dashboard + candidate portal, with JWT + HTTP-only cookie auth and email verification.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (App Router) · TypeScript · TailwindCSS · shadcn/ui |
| Backend | Django 5.2 · Django REST Framework · SimpleJWT |
| Realtime | Django Channels · Daphne · channels-redis |
| Database | PostgreSQL + **pgvector** (Supabase-managed in production) |
| Task queue | Celery + Redis |
| AI / ML | Ollama-served LLM (Qwen family) · `sentence-transformers` · `BAAI/bge-small-en-v1.5` (384-dim) |
| Resume parsing | `pdfplumber` · `python-docx` |
| Auth | JWT + HTTP-only cookies |
| Tooling | Ruff · Pytest · ESLint · Prettier · pre-commit |
| CI/CD | GitHub Actions |

---

## Architecture

```
┌──────────────┐      ┌─────────────────────┐      ┌──────────────┐
│  Next.js UI  │ ───▶ │  Django REST API    │ ───▶ │  PostgreSQL  │
│  (dashboard  │ ◀─── │  + Channels (WS)    │ ◀─── │  + pgvector  │
│  + candidate)│      └─────────┬───────────┘      └──────────────┘
└──────────────┘                │
                                ▼
                   ┌────────────────────────┐     ┌──────────────┐
                   │  Celery workers        │ ──▶ │  Ollama LLM  │
                   │  (parsing, ranking,    │     │  + embeddings│
                   │   batch, notifications)│     └──────────────┘
                   └───────────┬────────────┘
                               ▼
                          ┌─────────┐
                          │  Redis  │  (broker + channel layer)
                          └─────────┘
```

### Backend apps (`backend/apps/`)

| App | Responsibility |
|-----|----------------|
| `accounts` | Users, authentication, JWT cookie flows, email verification |
| `organizations` | Multi-tenant orgs and membership |
| `jobs` | Job postings and requirements |
| `candidates` | Candidate profiles, resumes, applications, notes |
| `ai_engine` | Embeddings, ranking, semantic search, experience timeline |
| `interviews` | AI-generated interview prep and questions |
| `pipeline` | Hiring stages and candidate movement |
| `batch` | Bulk resume upload and background screening |
| `analytics` | Recruitment metrics and reporting |
| `notifications` | Real-time + persisted notifications |
| `core` | Shared utilities, health checks, base models |

### Frontend routes (`frontend/app/`)

- **`(dashboard)`** — recruiter app: `jobs`, `candidates`, `applications`, `pipeline`, `search`, `batch`, `analytics`, `settings`
- **`(candidate)`** — candidate portal: `dashboard`, `applications`
- **`(public)`** — `login`, `register`, `jobs`, `pending-verification`

---

## Quick Start

### 1. Configure environment

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Generate a Django secret key and set `DJANGO_SECRET_KEY` in `.env`:

```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

### 2. Run with Docker (recommended)

```bash
docker compose up --build
docker compose exec django python manage.py migrate
```

### 3. Or run services locally

**Backend**

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

**Frontend**

```powershell
cd frontend
npm install
npm run dev
```

> **AI features** require a running [Ollama](https://ollama.com) instance and will download the `bge-small-en-v1.5` embedding model on first use. Set `OLLAMA_BASE_URL`, `LLM_MODEL`, and `EMBEDDING_MODEL` in `.env`.

---

## Service URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000/api/v1/ |
| Health check | http://localhost:8000/api/v1/health/ |
| Django admin | http://localhost:8000/admin/ |

---

## Development

**Backend**

```bash
pytest                    # Run tests
ruff check .              # Lint
ruff format .             # Format
python manage.py check    # Validate Django config
```

**Frontend**

```bash
npm run dev               # Dev server
npm run lint              # ESLint
npm run type-check        # TypeScript
npm run format            # Prettier
```

**Pre-commit**

```bash
pre-commit install         # Install hooks (run once)
pre-commit run --all-files # Run all hooks manually
```

---

## Repository Layout

```
backend/        Django API — apps, config, migrations, Celery tasks
frontend/       Next.js — App Router, components, types
supabase/       Supabase local dev config
infrastructure/ Docker and deployment support
raw/            Human-managed vault (architecture, ADRs, sprints)
wiki/           Knowledge base (Obsidian)
```

---

## Documentation

| Document | Location |
|----------|---------|
| System Overview | `raw/architecture/system-overview.md` |
| Development Setup | `raw/architecture/development-setup.md` |
| Environment Variables | `raw/architecture/environment-variables.md` |
| Auth Strategy | `raw/architecture/cookie-auth-strategy.md` |
| Architecture Decision Records | `raw/decisions/` |

---

## License

Released under the [MIT License](LICENSE).
