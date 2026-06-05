import hashlib
import math
import re
from dataclasses import dataclass
from typing import Any

import httpx
from django.conf import settings
from django.utils import timezone

TOKEN_PATTERN = re.compile(r"[a-z0-9][a-z0-9+#.\-]{1,}", re.IGNORECASE)
MAX_EMBEDDING_TEXT_CHARS = 12000


@dataclass(frozen=True)
class EmbeddingResult:
    vector: list[float]
    model: str
    text_hash: str


def normalize_embedding_text(text: str) -> str:
    compacted = " ".join((text or "").split())
    return compacted[:MAX_EMBEDDING_TEXT_CHARS]


def embedding_text_hash(text: str, model: str) -> str:
    normalized = normalize_embedding_text(text)
    return hashlib.sha256(f"{model}\n{normalized}".encode()).hexdigest()


def generate_embedding(text: str) -> EmbeddingResult:
    model = settings.EMBEDDING_MODEL
    normalized = normalize_embedding_text(text)
    provider = getattr(settings, "EMBEDDING_PROVIDER", "local_hashing")

    if provider == "ollama":
        return EmbeddingResult(
            vector=_ollama_embedding(normalized, model),
            model=model,
            text_hash=embedding_text_hash(normalized, model),
        )

    if provider != "local_hashing":
        raise ValueError(f"Unsupported embedding provider: {provider}")

    return EmbeddingResult(
        vector=_hashing_embedding(normalized, settings.EMBEDDING_DIMENSIONS),
        model=model,
        text_hash=embedding_text_hash(normalized, model),
    )


def build_job_embedding_text(job) -> str:
    parts = [
        f"Job title: {job.title}",
        f"Department: {job.department}" if job.department else "",
        f"Location: {job.location}",
        f"Employment type: {job.get_employment_type_display()}",
        f"Remote policy: {job.get_remote_policy_display()}" if job.remote_policy else "",
        f"Description: {job.description}",
        f"Requirements: {job.requirements}",
        f"Salary range: {job.salary_range}" if job.salary_range else "",
    ]
    return "\n".join(part for part in parts if part)


def build_candidate_embedding_text(parsed_resume) -> str:
    data = parsed_resume.data or {}
    personal_info = data.get("personal_info") or {}
    metadata = data.get("metadata") or {}

    parts = [
        f"Candidate: {personal_info.get('full_name')}" if personal_info.get("full_name") else "",
        f"Summary: {data.get('summary')}" if data.get("summary") else "",
        _join_named_items("Skills", data.get("skills"), ("name", "category", "proficiency")),
        _join_experience(data.get("experience")),
        _join_projects(data.get("projects")),
        _join_named_items(
            "Education",
            data.get("education"),
            ("degree", "institution", "field_of_study"),
        ),
        _join_named_items("Certifications", data.get("certifications"), ("name", "issuer")),
        (
            f"Total years experience: {metadata.get('total_years_experience')}"
            if metadata.get("total_years_experience") is not None
            else ""
        ),
    ]
    return "\n".join(part for part in parts if part)


def update_job_embedding(job, *, force: bool = False):
    text = build_job_embedding_text(job)
    result = generate_embedding(text)
    if not force and job.embedding_text_hash == result.text_hash and job.embedding is not None:
        return job

    job.embedding = result.vector
    job.embedding_model = result.model
    job.embedding_text_hash = result.text_hash
    job.embedding_generated_at = timezone.now()
    job.save(
        update_fields=[
            "embedding",
            "embedding_model",
            "embedding_text_hash",
            "embedding_generated_at",
            "updated_at",
        ]
    )
    return job


def update_parsed_resume_embedding(parsed_resume, *, force: bool = False):
    text = build_candidate_embedding_text(parsed_resume)
    result = generate_embedding(text)
    if (
        not force
        and parsed_resume.embedding_text_hash == result.text_hash
        and parsed_resume.embedding is not None
    ):
        return parsed_resume

    parsed_resume.embedding = result.vector
    parsed_resume.embedding_model = result.model
    parsed_resume.embedding_text_hash = result.text_hash
    parsed_resume.embedding_generated_at = timezone.now()
    parsed_resume.save(
        update_fields=[
            "embedding",
            "embedding_model",
            "embedding_text_hash",
            "embedding_generated_at",
            "updated_at",
        ]
    )
    return parsed_resume


def _hashing_embedding(text: str, dimensions: int) -> list[float]:
    vector = [0.0] * dimensions
    tokens = TOKEN_PATTERN.findall(text.lower())
    if not tokens:
        return vector

    for token in tokens:
        digest = hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest()
        value = int.from_bytes(digest, byteorder="big", signed=False)
        index = value % dimensions
        sign = 1.0 if value & 1 else -1.0
        vector[index] += sign

    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0:
        return vector

    return [round(value / norm, 6) for value in vector]


def _ollama_embedding(text: str, model: str) -> list[float]:
    base_url = settings.OLLAMA_BASE_URL.rstrip("/")
    timeout = getattr(settings, "OLLAMA_TIMEOUT_SECONDS", 120)
    response = httpx.post(
        f"{base_url}/api/embed",
        json={"model": model, "input": text},
        timeout=timeout,
    )
    if response.status_code == 404:
        response = httpx.post(
            f"{base_url}/api/embeddings",
            json={"model": model, "prompt": text},
            timeout=timeout,
        )
    response.raise_for_status()
    payload = response.json()
    vector = _extract_ollama_vector(payload)
    if len(vector) != settings.EMBEDDING_DIMENSIONS:
        raise ValueError(
            f"Embedding dimension mismatch: expected {settings.EMBEDDING_DIMENSIONS}, "
            f"got {len(vector)}"
        )
    return vector


def _extract_ollama_vector(payload: dict[str, Any]) -> list[float]:
    if isinstance(payload.get("embedding"), list):
        return [float(value) for value in payload["embedding"]]

    embeddings = payload.get("embeddings")
    if isinstance(embeddings, list) and embeddings and isinstance(embeddings[0], list):
        return [float(value) for value in embeddings[0]]

    raise ValueError("Ollama embedding response did not include a vector.")


def _join_named_items(label: str, items: Any, fields: tuple[str, ...]) -> str:
    rows = []
    for item in _as_list(items):
        if not isinstance(item, dict):
            continue
        values = [str(item.get(field)).strip() for field in fields if item.get(field)]
        if values:
            rows.append(" - ".join(values))
    return f"{label}: {'; '.join(rows)}" if rows else ""


def _join_experience(items: Any) -> str:
    rows = []
    for item in _as_list(items):
        if not isinstance(item, dict):
            continue
        parts = [
            item.get("title"),
            item.get("company"),
            item.get("description"),
            " ".join(_as_list(item.get("achievements"))),
        ]
        value = " - ".join(str(part).strip() for part in parts if part)
        if value:
            rows.append(value)
    return f"Experience: {'; '.join(rows)}" if rows else ""


def _join_projects(items: Any) -> str:
    rows = []
    for item in _as_list(items):
        if not isinstance(item, dict):
            continue
        technologies = item.get("technologies")
        parts = [
            item.get("name"),
            item.get("description"),
            " ".join(_as_list(technologies)),
        ]
        value = " - ".join(str(part).strip() for part in parts if part)
        if value:
            rows.append(value)
    return f"Projects: {'; '.join(rows)}" if rows else ""


def _as_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if value:
        return [value]
    return []
