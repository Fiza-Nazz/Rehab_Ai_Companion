# celery_worker.py — Entry point for Celery worker and Celery Beat scheduler
from app.tasks.celery_tasks import celery_app  # noqa: F401 — import triggers registration
