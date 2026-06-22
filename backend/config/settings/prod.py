import os

from .base import *  # noqa: F403

DEBUG = False

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
# Off by default: the platform edge (Railway) already serves HTTPS only, and
# when the frontend proxies API calls (Vercel rewrite -> Railway) the chained
# X-Forwarded-Proto header breaks Django's exact-match HTTPS check, causing a
# redirect loop. Enable only for setups that terminate plain HTTP at the app.
SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "false").lower() in {"1", "true", "yes", "on"}
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = False
X_FRAME_OPTIONS = "DENY"
