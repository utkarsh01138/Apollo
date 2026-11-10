import logging
from typing import Any
from fastapi import APIRouter, HTTPException, status
from app.core.task_manager import task_manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("/{task_id}", response_model=dict[str, Any])
async def get_task_status(task_id: str):
    """
    Polls status and execution progress of an asynchronous ML audio processing task.
    Prevents UI thread blocking and browser timeouts during heavy Demucs/Basic-Pitch workloads.
    """
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found.",
        )
    return task.to_dict()
