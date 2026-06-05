import math
import re
from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from apps.ai_engine.embeddings import update_job_embedding, update_parsed_resume_embedding
from apps.candidates.models import Application, ParsedResume
from apps.candidates.resume_parser import infer_skills

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


def rank_candidates_for_job(job, *, force: bool = False) -> list[CandidateScore]:
    applications = (
        Application.objects.filter(job=job, organization=job.organization)
        .select_related("candidate", "job", "organization")
        .prefetch_related("parsed_resumes")
    )
    scores = [score_application(application, force=force) for application in applications]
    return sorted(
        scores,
        key=lambda score: (score.final_score, score.application.applied_at),
        reverse=True,
    )


def score_application(application: Application, *, force: bool = False) -> CandidateScore:
    parsed_resume = _latest_completed_parsed_resume(application)
    job = application.job

    if job.embedding is None or force:
        update_job_embedding(job, force=force)

    if parsed_resume and (parsed_resume.embedding is None or force):
        update_parsed_resume_embedding(parsed_resume, force=force)

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

    application.set_scores(
        semantic_score=semantic_score,
        skill_score=skill_score,
        experience_score=experience_score,
        final_score=final_score,
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

    return CandidateScore(
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
    metadata = data.get("metadata") or {}
    explicit_years = _float_or_none(metadata.get("total_years_experience"))
    if explicit_years is not None:
        return explicit_years

    searchable_values = [data.get("summary")]
    for item in _as_list(data.get("experience")):
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
    return re.sub(r"[^a-z0-9+#.]+", "", skill.lower())


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
