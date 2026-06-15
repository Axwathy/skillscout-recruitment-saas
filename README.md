# SkillScout — AI Recruitment SaaS

AI-assisted enterprise recruitment platform. **Math ranks. AI explains. You decide.**

Sprint 1 complete: project foundation, backend app scaffold, JWT configuration, frontend route structure, design system, and development infrastructure.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 · TypeScript · TailwindCSS · shadcn/ui |
| Backend | Django 5.x · Django REST Framework · SimpleJWT |
| Database | PostgreSQL (Supabase-managed in production) |
| Auth | JWT + HTTP-only cookies (implemented Sprint 2) |
| Task queue | Celery + Redis |
| Local AI | Ollama · Qwen2.5-Coder:7B · BAAI/bge-small-en-v1.5 (Sprint 4+) |
| CI/CD | GitHub Actions |

---

## Quick Start

### 1. Copy environment variables

```bash
cp .env.example .env
# Also copy service-level examples
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Edit `.env` and set `DJANGO_SECRET_KEY` to a 50+ character random string:

```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

### 2. Start with Docker (recommended)

```bash
docker compose up --build
docker compose exec django python manage.py migrate
```

### 3. Or run services locally

**Backend:**

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

**Frontend:**

```powershell
cd frontend
npm install
npm run dev
```

---

## Service URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000/api/v1/ |
| Health check | http://localhost:8000/api/v1/health/ |
| Django admin | http://localhost:8000/admin/ |

---

## Development Commands

**Backend:**

```bash
pytest                    # Run tests
ruff check .              # Lint
ruff format .             # Format
python manage.py check    # Validate Django config
```

**Frontend:**

```bash
npm run dev               # Dev server
npm run lint              # ESLint
npm run type-check        # TypeScript
npm run format            # Prettier
```

**Pre-commit:**

```bash
pre-commit install         # Install hooks (run once)
pre-commit run --all-files # Run all hooks manually
```

---

## Repository Layout

```
backend/        Django API — apps, config, migrations
frontend/       Next.js — app router, components, types
supabase/       Supabase local dev config
infrastructure/ Docker, deployment support files
raw/            Human-managed vault (architecture, ADRs, sprints)
wiki/           LLM-managed Obsidian knowledge base
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

## Sprint Status

| Sprint | Status | Focus |
|--------|--------|-------|
| **1** | ✅ Complete | Foundation — project structure, DX, base models, JWT config |
| 2 | 🔜 Next | Authentication — login, register, JWT cookie flows |
| 3 | Planned | Organizations + Jobs domain |
| 4+ | Planned | Candidates, AI pipeline, pipeline management, analytics |
