# Deployment — Vercel (frontend) + Railway (backend)

SkillScout deploys as: **Next.js frontend on Vercel**, **Django backend + Celery worker on Railway**, with **Postgres + Redis on Railway**. The LLM (Qwen) is a **hosted Ollama endpoint** (not self-hosted), and resumes live in **Supabase storage**.

> Do **not** deploy the Django backend on Vercel — it needs a persistent ASGI server (Channels/WebSockets) and a Celery worker, which Vercel's serverless model can't run.

---

## 1. Railway — backend

1. **New Project → Deploy from GitHub** → select this repo.
2. On the backend service: **Settings → Root Directory = `backend`**. Railway then uses `backend/Dockerfile` and `backend/railway.json`.
3. **Add a database:** New → Database → **PostgreSQL** (includes pgvector; the migrations create the `vector` extension automatically).
4. **Add Redis:** New → Database → **Redis**.
5. **Variables** on the backend service (see `backend/.env.production.example`). Key ones:
   - `DJANGO_SETTINGS_MODULE=config.settings.prod`
   - `DJANGO_SECRET_KEY=` (generate a strong one)
   - `DJANGO_ALLOWED_HOSTS=<your-api>.up.railway.app`
   - `DJANGO_CORS_ALLOWED_ORIGINS=https://<your-frontend>.vercel.app`
   - `DJANGO_CSRF_TRUSTED_ORIGINS=https://<your-frontend>.vercel.app,https://<your-api>.up.railway.app`
   - `COOKIE_SAMESITE=None` and `AUTH_COOKIE_SECURE=true`  ← required for cross-site login
   - `DATABASE_URL=${{ Postgres.DATABASE_URL }}`
   - `REDIS_URL=${{ Redis.REDIS_URL }}`
   - `CELERY_BROKER_URL=${{ Redis.REDIS_URL }}` and `CELERY_RESULT_BACKEND=${{ Redis.REDIS_URL }}`
   - LLM + Supabase vars (see the example file)
6. **Networking → Generate Domain** to get the public API URL.
7. **Celery worker** — add a **second service** from the same repo (Root Directory `backend`), and override its **Start Command**:
   ```
   celery -A config worker -l info
   ```
   (Add a third service with `celery -A config beat -l info` only if you use scheduled batch jobs.)

The web service's start command (migrations + Daphne) is already defined in `backend/railway.json`.

---

## 2. Vercel — frontend

1. **New Project** → import this repo.
2. **Application Preset = Next.js** (not "Services"), **Root Directory = `frontend`**.
3. **Environment Variable:** `NEXT_PUBLIC_API_URL=https://<your-api>.up.railway.app`
4. Deploy. Vercel gives you `https://<your-frontend>.vercel.app`.
5. Back on Railway, make sure that Vercel URL is in `DJANGO_CORS_ALLOWED_ORIGINS` and `DJANGO_CSRF_TRUSTED_ORIGINS`, then redeploy the backend.

---

## 3. Cross-site login (important)

Frontend (`*.vercel.app`) and backend (`*.railway.app`) are different sites, so the auth cookie must be `SameSite=None; Secure` (set via `COOKIE_SAMESITE=None` + `AUTH_COOKIE_SECURE=true`), and CORS must allow credentials for the exact Vercel origin (already handled by `DJANGO_CORS_ALLOWED_ORIGINS`).

**Cleaner alternative:** put both behind one parent domain (`app.skillscout.com` + `api.skillscout.com`); then you can use `COOKIE_SAMESITE=Lax` and avoid third-party-cookie friction.

---

## 4. Post-deploy checklist

- [ ] Backend `/api/v1/health/` returns 200
- [ ] `/api/docs/` (Swagger) loads
- [ ] Login works from the Vercel frontend (cookie persists)
- [ ] Semantic search / ranking works (pgvector extension created)
- [ ] A batch-screening job runs (Celery worker is up)
