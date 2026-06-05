import logging

from celery import shared_task

from apps.ai_engine.embeddings import update_job_embedding, update_parsed_resume_embedding
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
