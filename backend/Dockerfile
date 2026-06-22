FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir /wheels/*

COPY . .

RUN python manage.py collectstatic --noinput

EXPOSE 8000

# Run migrations, then serve via Daphne (ASGI) so Django Channels / WebSockets
# work. Bind to :: (IPv6 dual-stack) because Railway's edge reaches the
# container over its IPv6 private network; 0.0.0.0 (IPv4-only) is unreachable
# and yields 502s. Use the platform-provided $PORT, defaulting to 8000.
CMD ["sh", "-c", "python manage.py migrate --noinput && daphne -b :: -p ${PORT:-8000} config.asgi:application"]

