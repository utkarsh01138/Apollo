import asyncio
import logging
import threading
import traceback
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Coroutine, Optional

logger = logging.getLogger(__name__)


class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskInfo:
    def __init__(
        self,
        task_id: str,
        task_type: str,
        session_id: Optional[str] = None,
        metadata: Optional[dict[str, Any]] = None,
    ):
        self.task_id = task_id
        self.task_type = task_type
        self.session_id = session_id
        self.status = TaskStatus.PENDING
        self.progress = 0.0
        self.stage = "Queued"
        self.created_at = datetime.now(timezone.utc).isoformat()
        self.started_at: Optional[str] = None
        self.completed_at: Optional[str] = None
        self.result: Optional[dict[str, Any]] = None
        self.error: Optional[str] = None
        self.metadata = metadata or {}

    def to_dict(self) -> dict[str, Any]:
        return {
            "task_id": self.task_id,
            "task_type": self.task_type,
            "session_id": self.session_id,
            "status": self.status.value,
            "progress": round(self.progress, 1),
            "stage": self.stage,
            "created_at": self.created_at,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
            "result": self.result,
            "error": self.error,
            "metadata": self.metadata,
        }


class TaskManager:
    """
    Centralized in-memory asynchronous task orchestrator.
    Prevents browser timeout errors during heavy ML inference (Demucs, Basic-Pitch)
    by running tasks in background worker threads and tracking progressive state.
    """

    def __init__(self):
        self._tasks: dict[str, TaskInfo] = {}
        self._asyncio_tasks: dict[str, asyncio.Task] = {}
        self._lock = threading.Lock()

    def create_task(
        self,
        task_type: str,
        session_id: Optional[str] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> TaskInfo:
        with self._lock:
            task_id = f"task_{uuid.uuid4().hex[:12]}"
            info = TaskInfo(
                task_id=task_id,
                task_type=task_type,
                session_id=session_id,
                metadata=metadata,
            )
            self._tasks[task_id] = info
            return info

    def get_task(self, task_id: str) -> Optional[TaskInfo]:
        with self._lock:
            return self._tasks.get(task_id)

    async def update_progress(self, task_id: str, progress: float, stage: str) -> None:
        with self._lock:
            task = self._tasks.get(task_id)
            if task and task.status == TaskStatus.RUNNING:
                task.progress = min(max(progress, 0.0), 100.0)
                task.stage = stage

    async def set_running(self, task_id: str, stage: str = "Processing") -> None:
        with self._lock:
            task = self._tasks.get(task_id)
            if task:
                task.status = TaskStatus.RUNNING
                task.stage = stage
                task.started_at = datetime.now(timezone.utc).isoformat()

    async def set_completed(self, task_id: str, result: dict[str, Any]) -> None:
        with self._lock:
            task = self._tasks.get(task_id)
            if task:
                task.status = TaskStatus.COMPLETED
                task.progress = 100.0
                task.stage = "Completed"
                task.result = result
                task.completed_at = datetime.now(timezone.utc).isoformat()

    async def set_failed(self, task_id: str, error_msg: str) -> None:
        with self._lock:
            task = self._tasks.get(task_id)
            if task:
                task.status = TaskStatus.FAILED
                task.stage = "Failed"
                task.error = error_msg
                task.completed_at = datetime.now(timezone.utc).isoformat()

    def run_coroutine(
        self,
        task_id: str,
        coro_func: Callable[[str, Callable[[float, str], Coroutine[Any, Any, None]]], Coroutine[Any, Any, dict[str, Any]]],
    ) -> None:
        """
        Executes an async task in the background. The coro_func receives (task_id, progress_callback).
        """
        async def _wrapper():
            await self.set_running(task_id)
            
            async def progress_callback(progress: float, stage: str):
                await self.update_progress(task_id, progress, stage)

            try:
                result = await coro_func(task_id, progress_callback)
                await self.set_completed(task_id, result)
            except asyncio.CancelledError:
                with self._lock:
                    task = self._tasks.get(task_id)
                    if task:
                        task.status = TaskStatus.CANCELLED
                        task.stage = "Cancelled"
                        task.completed_at = datetime.now(timezone.utc).isoformat()
            except Exception as e:
                err_detail = f"{str(e)}\n{traceback.format_exc()}"
                logger.error(f"Task {task_id} failed: {err_detail}")
                await self.set_failed(task_id, str(e))

        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = asyncio.get_event_loop()

        asyncio_task = loop.create_task(_wrapper())
        with self._lock:
            self._asyncio_tasks[task_id] = asyncio_task


task_manager = TaskManager()
