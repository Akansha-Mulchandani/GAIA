from celery import Celery
import os

# Initialize Celery
celery_app = Celery('gaia',
                    broker=os.getenv('REDIS_URL', 'redis://redis:6379/0'),
                    backend=os.getenv('REDIS_URL', 'redis://redis:6379/0'),
                    include=['app.tasks.ml_tasks'])

# Optional configuration
celery_app.conf.update(
    result_expires=3600,
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)
