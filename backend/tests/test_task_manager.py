import asyncio
import pytest
from app.core.task_manager import TaskManager, TaskStatus


@pytest.mark.asyncio
async def test_task_manager_success_flow():
    mgr = TaskManager()
    task = mgr.create_task("test_separation", session_id="sess_123")
    assert task.status == TaskStatus.PENDING
    assert task.progress == 0.0

    async def mock_worker(task_id, progress_cb):
        await progress_cb(50.0, "Halfway done")
        await asyncio.sleep(0.05)
        return {"stems": ["vocals.wav", "bass.wav"]}

    mgr.run_coroutine(task.task_id, mock_worker)
    
    # Wait for completion
    for _ in range(50):
        await asyncio.sleep(0.02)
        polled = mgr.get_task(task.task_id)
        if polled.status == TaskStatus.COMPLETED:
            break

    assert polled.status == TaskStatus.COMPLETED
    assert polled.progress == 100.0
    assert polled.result == {"stems": ["vocals.wav", "bass.wav"]}


@pytest.mark.asyncio
async def test_task_manager_failure_flow():
    mgr = TaskManager()
    task = mgr.create_task("failing_job")

    async def broken_worker(task_id, progress_cb):
        raise ValueError("Corrupted audio data encountered")

    mgr.run_coroutine(task.task_id, broken_worker)

    for _ in range(50):
        await asyncio.sleep(0.02)
        polled = mgr.get_task(task.task_id)
        if polled.status == TaskStatus.FAILED:
            break

    assert polled.status == TaskStatus.FAILED
    assert "Corrupted audio data" in polled.error
