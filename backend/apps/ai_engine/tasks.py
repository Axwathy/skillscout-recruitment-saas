import logging

from celery import shared_task

from apps.ai_engine.embeddings import update_job_embedding, update_parsed_resume_embedding
from apps.ai_engine.ranking import rank_candidates_for_job
from apps.candidates.models import ParsedResume
from apps.jobs.models import Job

logger = logging.getLogger(__name__)


@shared_task(
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_jitter=True,
    retry_kwargs={"max_retries": 2},
)
def generate_job_embedding(job_id: str, force: bool = False) -> None:
    job = Job.objects.get(id=job_id)
    update_job_embedding(job, force=force)


@shared_task(
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_jitter=True,
    retry_kwargs={"max_retries": 2},
)
def generate_parsed_resume_embedding(parsed_resume_id: str, force: bool = False) -> None:
    parsed_resume = ParsedResume.objects.get(id=parsed_resume_id)
    if parsed_resume.status != ParsedResume.Status.COMPLETED:
        logger.info("Skipping embedding for incomplete parsed resume %s", parsed_resume_id)
        return
    update_parsed_resume_embedding(parsed_resume, force=force)


@shared_task(
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_jitter=True,
    retry_kwargs={"max_retries": 2},
)
def batch_score_applications(job_id: str, force: bool = False) -> int:
    """Persist hybrid scores for every application on a job.

    Triggered when a job is created or updated (its embedding text and required
    skills may have changed). ``rank_candidates_for_job(..., persist=True)``
    ensures the job embedding exists, computes each candidate's score, and writes
    it to the ``Application`` row so the read-only ranked-candidates GET can serve
    cached scores. Returns the number of applications scored.
    """
    job = Job.objects.get(id=job_id)
    scored = rank_candidates_for_job(job, force=force, persist=True)
    logger.info("Batch-scored %d application(s) for job %s", len(scored), job_id)
    return len(scored)
