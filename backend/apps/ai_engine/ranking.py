import math
import re
from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from apps.ai_engine.embeddings import update_job_embedding, update_parsed_resume_embedding
from apps.ai_engine.experience_timeline import compute_experience_timeline
from apps.candidates.models import Application, ParsedResume
from apps.candidates.resume_parser import KNOWN_SKILLS, infer_skills

SCORE_VERSION = "hybrid-v1"
SEMANTIC_WEIGHT = 0.45
SKILL_WEIGHT = 0.30
EXPERIENCE_WEIGHT = 0.25
YEARS_PATTERN = re.compile(r"(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)", re.IGNORECASE)


@dataclass(frozen=True)
class CandidateScore:
    application: Application
    parsed_resume: ParsedResume | None
    semantic_score: float
    skill_score: float
    experience_score: float
    final_score: float
    matched_skills: list[str]
    missing_skills: list[str]
    candidate_skills: list[str]
    job_skills: list[str]
    required_experience_years: float | None
    candidate_experience_years: float | None


def rank_candidates_for_job(
    job, *, force: bool = False, persist: bool = False
) -> list[CandidateScore]:
    """Rank a job's applications by final score.

    Read-only by default: viewing rankings (the GET path) must not mutate
    ``Application`` rows. Pass ``persist=True`` (batch scoring) to store the
    computed scores, or ``force=True`` to also regenerate embeddings.
    """
    applications = (
        Application.objects.filter(job=job, organization=job.organization)
        .select_related("candidate", "job", "organization")
        .prefetch_related("parsed_resumes")
    )
    scores = [
        build_candidate_score(
            application,
            regenerate_embeddings=force,
            persist=persist or force,
        )
        for application in applications
    ]
    return sorted(
        scores,
        key=lambda score: (score.final_score, score.application.applied_at),
        reverse=True,
    )


def build_candidate_score(
    application: Application,
    *,
    regenerate_embeddings: bool = False,
    persist: bool = False,
) -> CandidateScore:
    """Compute a candidate's hybrid score.

    Pure by default — performs no score writes unless ``persist=True``. The
    ranked-candidates GET path relies on this so that simply *viewing* rankings
    never mutates data. Embeddings are only (re)generated when missing or when
    ``regenerate_embeddings`` is set.
    """
    parsed_resume = _latest_completed_parsed_resume(application)
    job = application.job

    if job.embedding is None or regenerate_embeddings:
        update_job_embedding(job, force=regenerate_embeddings)

    if parsed_resume and (parsed_resume.embedding is None or regenerate_embeddings):
        update_parsed_resume_embedding(parsed_resume, force=regenerate_embeddings)

    semantic_score = calculate_semantic_similarity(
        job.embedding,
        parsed_resume.embedding if parsed_resume else None,
    )
    job_skills = extract_job_skills(job)
    candidate_skills = extract_candidate_skills(parsed_resume)
    skill_score, matched_skills, missing_skills = calculate_skill_match(
        job_skills,
        candidate_skills,
    )
    required_years = extract_required_experience_years(job)
    candidate_years = extract_candidate_experience_years(parsed_resume)
    experience_score = calculate_experience_match(required_years, candidate_years)
    final_score = calculate_hybrid_score(semantic_score, skill_score, experience_score)

    score = CandidateScore(
        application=application,
        parsed_resume=parsed_resume,
        semantic_score=semantic_score,
        skill_score=skill_score,
        experience_score=experience_score,
        final_score=final_score,
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        candidate_skills=candidate_skills,
        job_skills=job_skills,
        required_experience_years=required_years,
        candidate_experience_years=candidate_years,
    )

    if persist:
        persist_application_scores(application, score)

    return score


def persist_application_scores(application: Application, score: CandidateScore) -> None:
    """Write the computed sub-scores to the ``Application`` row."""
    application.set_scores(
        semantic_score=score.semantic_score,
        skill_score=score.skill_score,
        experience_score=score.experience_score,
        final_score=score.final_score,
        score_version=SCORE_VERSION,
    )
    application.save(
        update_fields=[
            "semantic_score",
            "skill_score",
            "experience_score",
            "final_score",
            "score_version",
            "score_calculated_at",
            "updated_at",
        ]
    )


def score_application(
    application: Application, *, force: bool = False, persist: bool = True
) -> CandidateScore:
    """Compute and (by default) persist a candidate's score.

    Thin wrapper kept for callers that want compute-and-store behaviour
    (resume parse task, batch scoring).
    """
    return build_candidate_score(
        application,
        regenerate_embeddings=force,
        persist=persist,
    )


def calculate_hybrid_score(
    semantic_similarity: float,
    skill_match: float,
    experience_match: float,
) -> float:
    return _clamp_score(
        (SEMANTIC_WEIGHT * semantic_similarity)
        + (SKILL_WEIGHT * skill_match)
        + (EXPERIENCE_WEIGHT * experience_match)
    )


def calculate_semantic_similarity(left: Any, right: Any) -> float:
    left_vector = _vector_to_list(left)
    right_vector = _vector_to_list(right)
    if not left_vector or not right_vector:
        return 0.0

    dot_product = sum(
        left_value * right_value
        for left_value, right_value in zip(left_vector, right_vector, strict=False)
    )
    left_norm = math.sqrt(sum(value * value for value in left_vector))
    right_norm = math.sqrt(sum(value * value for value in right_vector))
    if left_norm == 0 or right_norm == 0:
        return 0.0

    return _clamp_score(dot_product / (left_norm * right_norm))


def calculate_skill_match(
    job_skills: list[str],
    candidate_skills: list[str],
) -> tuple[float, list[str], list[str]]:
    normalized_candidate_skills = {_normalize_skill(skill) for skill in candidate_skills}
    matched = [
        skill
        for skill in job_skills
        if _normalize_skill(skill) in normalized_candidate_skills
    ]
    missing = [skill for skill in job_skills if skill not in matched]

    if not job_skills:
        return 1.0, [], []

    return _clamp_score(len(matched) / len(job_skills)), matched, missing


def calculate_experience_match(
    required_years: float | None,
    candidate_years: float | None,
) -> float:
    if required_years is None or required_years <= 0:
        return 1.0
    if candidate_years is None:
        return 0.0
    return _clamp_score(candidate_years / required_years)


def extract_job_skills(job) -> list[str]:
    text = " ".join([job.title or "", job.description or "", job.requirements or ""])
    return sorted(set(infer_skills(text)))


def extract_candidate_skills(parsed_resume: ParsedResume | None) -> list[str]:
    if not parsed_resume:
        return []
    data = parsed_resume.data or {}
    skills = []
    for item in _as_list(data.get("skills")):
        if isinstance(item, dict) and item.get("name"):
            skills.append(str(item["name"]))
        elif isinstance(item, str):
            skills.append(item)
    return sorted(set(skills), key=str.lower)


def extract_required_experience_years(job) -> float | None:
    text = " ".join([job.title or "", job.description or "", job.requirements or ""])
    matches = [float(match.group(1)) for match in YEARS_PATTERN.finditer(text)]
    return min(matches) if matches else None


def extract_candidate_experience_years(parsed_resume: ParsedResume | None) -> float | None:
    if not parsed_resume:
        return None
    data = parsed_resume.data or {}
    metadata = _resume_metadata(data)
    explicit_years = _float_or_none(metadata.get("total_years_experience"))
    if explicit_years is not None:
        return explicit_years

    # Upgrade: compute real months from parsed experience dates with overlap
    # detection instead of regex-scanning text for "X years" mentions.
    experience_items = _as_list(data.get("experience"))
    if experience_items:
        timeline = compute_experience_timeline(experience_items)
        if timeline.total_months > 0:
            return round(timeline.total_months / 12, 1)

    # Final fallback: scan text for explicit year mentions
    searchable_values = [data.get("summary")]
    for item in experience_items:
        if isinstance(item, dict):
            searchable_values.extend(
                [
                    item.get("duration"),
                    item.get("description"),
                    " ".join(_as_list(item.get("achievements"))),
                ]
            )
    text = " ".join(str(value) for value in searchable_values if value)
    matches = [float(match.group(1)) for match in YEARS_PATTERN.finditer(text)]
    return max(matches) if matches else None


def score_to_percent(score: float | Decimal | None) -> int:
    if score is None:
        return 0
    return round(float(score) * 100)


def _latest_completed_parsed_resume(application: Application) -> ParsedResume | None:
    parsed_resumes = application.parsed_resumes.filter(status=ParsedResume.Status.COMPLETED)
    return parsed_resumes.order_by("-parsed_at", "-created_at").first()


def _vector_to_list(vector: Any) -> list[float]:
    if vector is None:
        return []
    return [float(value) for value in vector]


def _clamp_score(value: float) -> float:
    return round(min(max(float(value), 0.0), 1.0), 5)


def _normalize_skill(skill: str) -> str:
    """Normalize a skill name for matching, resolving aliases via KNOWN_SKILLS.

    E.g. "K8s" → "kubernetes", "RoR" → "rubyonrails", "JS" → "javascript".
    """
    lowered = skill.lower().strip()
    # Check if this matches any alias in KNOWN_SKILLS and resolve to canonical
    for canonical, _category, aliases in KNOWN_SKILLS:
        all_names = (canonical.lower(), *(a.lower() for a in aliases))
        if lowered in all_names:
            return re.sub(r"[^a-z0-9+#.]+", "", canonical.lower())
    return re.sub(r"[^a-z0-9+#.]+", "", lowered)


def _float_or_none(value: Any) -> float | None:
    try:
        if value is None or value == "":
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _as_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if value:
        return [value]
    return []


def _resume_metadata(data: dict[str, Any]) -> dict[str, Any]:
    metadata = data.get("_metadata") or data.get("metadata") or {}
    return metadata if isinstance(metadata, dict) else {}
