
import math
from types import SimpleNamespace

import httpx
from django.test import override_settings

from apps.ai_engine.embeddings import build_candidate_embedding_text, generate_embedding
from apps.ai_engine.ranking import (
    calculate_experience_match,
    calculate_hybrid_score,
    calculate_skill_match,
)


@override_settings(
    EMBEDDING_DIMENSIONS=16,
    EMBEDDING_MODEL="test-embedding-model",
    EMBEDDING_PROVIDER="local_hashing",
)
def test_local_hashing_embedding_is_deterministic_and_normalized():
    first = generate_embedding("Python Django React")
    second = generate_embedding("Python Django React")

    assert first.model == "test-embedding-model"
    assert first.vector == second.vector
    assert first.text_hash == second.text_hash
    assert len(first.vector) == 16
    assert math.isclose(
        math.sqrt(sum(value * value for value in first.vector)),
        1.0,
        rel_tol=1e-5,
    )


def test_candidate_embedding_text_includes_profile_skills_and_projects():
    parsed_resume = SimpleNamespace(
        data={
            "personal_info": {"full_name": "Parthiv A M"},
            "summary": "Full-stack developer.",
            "skills": [{"name": "Python"}, {"name": "React"}],
            "projects": [{"name": "Recruitment SaaS", "technologies": ["Django"]}],
        }
    )

    text = build_candidate_embedding_text(parsed_resume)

    assert "Parthiv A M" in text
    assert "Python" in text
    assert "React" in text
    assert "Recruitment SaaS" in text


@override_settings(
    EMBEDDING_DIMENSIONS=3,
    EMBEDDING_MODEL="BAAI/bge-small-en-v1.5",
    EMBEDDING_PROVIDER="ollama",
    OLLAMA_BASE_URL="http://localhost:11434",
)
def test_ollama_embedding_provider_uses_configured_model(monkeypatch):
    requests = []

    def fake_post(url, *, json, timeout):
        requests.append({"url": url, "json": json, "timeout": timeout})
        request = httpx.Request("POST", url)
        return httpx.Response(200, json={"embeddings": [[0.1, 0.2, 0.3]]}, request=request)

    monkeypatch.setattr(httpx, "post", fake_post)

    result = generate_embedding("Python Django")

    assert result.model == "BAAI/bge-small-en-v1.5"
    assert result.vector == [0.1, 0.2, 0.3]
    assert requests[0]["url"] == "http://localhost:11434/api/embed"
    assert requests[0]["json"]["model"] == "BAAI/bge-small-en-v1.5"


def test_skill_match_scores_required_skills_only():
    score, matched, missing = calculate_skill_match(
        ["Python", "Django", "PostgreSQL"],
        ["Python", "Django", "React"],
    )

    assert score == 0.66667
    assert matched == ["Python", "Django"]
    assert missing == ["PostgreSQL"]


def test_experience_match_caps_at_full_score():
    assert calculate_experience_match(3, 4) == 1.0
    assert calculate_experience_match(4, 2) == 0.5
    assert calculate_experience_match(None, None) == 1.0


def test_hybrid_score_uses_production_weights():
    score = calculate_hybrid_score(
        semantic_similarity=0.92,
        skill_match=0.85,
        experience_match=0.80,
    )

    assert score == 0.869
