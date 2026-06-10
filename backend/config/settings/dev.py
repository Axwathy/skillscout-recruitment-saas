from .base import *  # noqa: F403

DEBUG = True
ALLOWED_HOSTS = ["*"]

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Keep local development self-contained. Without a running Celery worker, .delay()
# successfully queues jobs in Redis but resume parsing never executes.
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
