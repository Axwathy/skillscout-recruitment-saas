import os
from datetime import timedelta
from pathlib import Path

import dj_database_url

BASE_DIR = Path(__file__).resolve().parents[2]


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env_file(BASE_DIR / ".env")

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "unsafe-dev-secret-key")
DEBUG = os.getenv("DEBUG", "False").lower() in {"1", "true", "yes", "on"}

ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    if host.strip()
]

INSTALLED_APPS = [
    "daphne",
    # Django built-ins
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "drf_spectacular",
    "channels",
    "pgvector.django",
    # Internal apps
    "apps.accounts",
    "apps.core",
    "apps.organizations",
    "apps.jobs",
    "apps.candidates",
    "apps.pipeline",
    "apps.ai_engine",
    "apps.interviews",
    "apps.analytics",
    "apps.notifications",
    "apps.batch",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "apps.core.middleware.SecurityHeadersMiddleware",
    "django.middleware.gzip.GZipMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.core.middleware.ApiSecurityAuditMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=60,
    )
}

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Cache / rate limiting
# ---------------------------------------------------------------------------
CACHE_URL = os.getenv("CACHE_URL", "")
CACHES = {
    "default": (
        {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": CACHE_URL,
        }
        if CACHE_URL
        else {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "recruitai-default",
        }
    )
}

# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------
SPECTACULAR_SETTINGS = {
    "TITLE": "SkillScout API",
    "DESCRIPTION": (
        "AI-assisted recruitment platform API — jobs, candidates, applications, "
        "AI scoring, pipeline, interviews, analytics, and notifications."
    ),
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.accounts.authentication.CookieJWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": os.getenv("API_ANON_RATE", "100/min"),
        "user": os.getenv("API_USER_RATE", "100/min"),
        "auth_register": os.getenv("AUTH_REGISTER_RATE", "5/min"),
        "auth_login": os.getenv("AUTH_LOGIN_RATE", "5/min"),
        "auth_refresh": os.getenv("AUTH_REFRESH_RATE", "20/min"),
        "upload": os.getenv("UPLOAD_RATE", "10/min"),
        "search": os.getenv("SEARCH_RATE", "30/min"),
    },
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.FormParser",
        "rest_framework.parsers.MultiPartParser",
    ],
}

# ---------------------------------------------------------------------------
# Simple JWT — token configuration
# Sprint 1: installed + configured. Custom cookie auth implementation -> Sprint 2.
# Cookie strategy documented in raw/architecture/cookie-auth-strategy.md
# ---------------------------------------------------------------------------
SIMPLE_JWT = {
    # Token lifetimes
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    # Rotation: new refresh token issued on every refresh call
    "ROTATE_REFRESH_TOKENS": True,
    # Blacklist consumed refresh tokens (requires rest_framework_simplejwt.token_blacklist)
    "BLACKLIST_AFTER_ROTATION": True,
    # Signing algorithm
    "ALGORITHM": "HS256",
    "SIGNING_KEY": os.getenv("DJANGO_SECRET_KEY", "unsafe-dev-secret-key"),
    # Token type claim
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    # Token validation
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    # Token classes
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    "TOKEN_TYPE_CLAIM": "token_type",
}

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "DJANGO_CORS_ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]
CORS_ALLOW_CREDENTIALS = True

# ---------------------------------------------------------------------------
# Browser security
# ---------------------------------------------------------------------------
CSRF_COOKIE_NAME = "csrftoken"
CSRF_COOKIE_HTTPONLY = False

# Cookie SameSite — "Lax" for same-site (local dev), "None" for cross-site
# production (frontend and backend on different domains, e.g. Vercel + Railway).
# Browsers require Secure when SameSite=None.
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "Lax")
CSRF_COOKIE_SAMESITE = COOKIE_SAMESITE
SESSION_COOKIE_SAMESITE = COOKIE_SAMESITE
AUTH_COOKIE_SAMESITE = COOKIE_SAMESITE
AUTH_COOKIE_SECURE = os.getenv("AUTH_COOKIE_SECURE", "false" if DEBUG else "true").lower() in {
    "1",
    "true",
    "yes",
    "on",
}

# Origins trusted for cross-site CSRF-protected POSTs (full scheme + host).
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("DJANGO_CSRF_TRUSTED_ORIGINS", "").split(",")
    if origin.strip()
]
ENFORCE_CSRF_ON_COOKIE_AUTH = os.getenv(
    "ENFORCE_CSRF_ON_COOKIE_AUTH",
    "false" if DEBUG else "true",
).lower() in {"1", "true", "yes", "on"}
AUTH_FAILED_LOGIN_LIMIT = int(os.getenv("AUTH_FAILED_LOGIN_LIMIT", "10"))
AUTH_LOCKOUT_SECONDS = int(os.getenv("AUTH_LOCKOUT_SECONDS", "900"))
CONTENT_SECURITY_POLICY = os.getenv(
    "CONTENT_SECURITY_POLICY",
    "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
)

# ---------------------------------------------------------------------------
# Redis / Celery
# ---------------------------------------------------------------------------
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/1")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://redis:6379/2")
CELERY_TASK_DEFAULT_QUEUE = "default"
BATCH_MAX_ACTIVE_PER_ORG = int(os.getenv("BATCH_MAX_ACTIVE_PER_ORG", "3"))

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [REDIS_URL],
        },
    }
}

# ---------------------------------------------------------------------------
# AI / Ollama — settings only. No implementation in Sprint 1.
# ---------------------------------------------------------------------------
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", "")
# Primary parsing model. NOTE: gpt-oss:20b returns empty output on the Ollama
# Cloud endpoint (harmony-channel content is dropped server-side), so it is not a
# usable default. qwen3-coder:480b is fast and reliable for structured JSON.
LLM_MODEL = os.getenv("LLM_MODEL", "qwen3-coder:480b")
LLM_FALLBACK_MODELS = [
    model.strip()
    for model in os.getenv("LLM_FALLBACK_MODELS", "gemma3:12b,gemma3:4b").split(",")
    if model.strip()
]
OLLAMA_NUM_PREDICT = int(os.getenv("OLLAMA_NUM_PREDICT", "4096"))
OLLAMA_TIMEOUT_SECONDS = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "120"))
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
EMBEDDING_DIMENSIONS = int(os.getenv("EMBEDDING_DIMENSIONS", "384"))
EMBEDDING_PROVIDER = os.getenv("EMBEDDING_PROVIDER", "sentence_transformers")

# ---------------------------------------------------------------------------
# Email (notifications) — provider-agnostic via Django SMTP.
# dev.py overrides EMAIL_BACKEND with the console backend.
# ---------------------------------------------------------------------------
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = os.getenv("EMAIL_HOST", "")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True").lower() in {"1", "true", "yes", "on"}
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "no-reply@skillscout.local")
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")
