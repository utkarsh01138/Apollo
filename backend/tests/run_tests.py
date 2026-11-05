"""
Standalone test runner using Python standard library (unittest + asyncio).
Allows verification in environments without pytest.
"""
import asyncio
import os
import sys
import tempfile
import unittest
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.session_manager import SessionManager
from app.core.task_manager import TaskManager, TaskStatus


class TestSessionManager(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.mgr = SessionManager(base_storage_dir=Path(self.temp_dir.name))

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_session_lifecycle(self):
        meta = self.mgr.create_session("electric_bass.wav")
        session_id = meta["session_id"]
        self.assertTrue(self.mgr.session_exists(session_id))

        session_dir = self.mgr.get_session_dir(session_id)
        self.assertTrue((session_dir / "raw").is_dir())
        self.assertTrue((session_dir / "stems").is_dir())
        self.assertTrue((session_dir / "midi").is_dir())
        self.assertTrue((session_dir / "notation").is_dir())

        read_meta = self.mgr.get_metadata(session_id)
        self.assertEqual(read_meta["original_filename"], "electric_bass.wav")

        self.mgr.update_metadata(session_id, {"status": "separated", "stems": {"bass": "stems/bass.wav"}})
        updated_meta = self.mgr.get_metadata(session_id)
        self.assertEqual(updated_meta["status"], "separated")

    def test_stem_path_generation(self):
        meta = self.mgr.create_session("track.mp3")
        session_id = meta["session_id"]
        bass_path = self.mgr.get_stem_path(session_id, "bass")
        self.assertEqual(bass_path.name, "bass.wav")


class TestTaskManager(unittest.TestCase):
    def test_task_lifecycle_success(self):
        async def _test():
            mgr = TaskManager()
            task = mgr.create_task("test_separation", session_id="sess_abc")
            self.assertEqual(task.status, TaskStatus.PENDING)

            async def sample_worker(task_id, progress_cb):
                await progress_cb(50.0, "Separating stems...")
                await asyncio.sleep(0.01)
                return {"stems": ["vocals.wav", "bass.wav", "drums.wav", "other.wav"]}

            mgr.run_coroutine(task.task_id, sample_worker)

            for _ in range(50):
                await asyncio.sleep(0.02)
                t = mgr.get_task(task.task_id)
                if t.status == TaskStatus.COMPLETED:
                    break

            self.assertEqual(t.status, TaskStatus.COMPLETED)
            self.assertEqual(t.progress, 100.0)
            self.assertIn("vocals.wav", t.result["stems"])

        asyncio.run(_test())

    def test_task_lifecycle_failure(self):
        async def _test():
            mgr = TaskManager()
            task = mgr.create_task("broken_job")

            async def failing_worker(task_id, progress_cb):
                raise RuntimeError("Audio channel decode error")

            mgr.run_coroutine(task.task_id, failing_worker)

            for _ in range(50):
                await asyncio.sleep(0.02)
                t = mgr.get_task(task.task_id)
                if t.status == TaskStatus.FAILED:
                    break

            self.assertEqual(t.status, TaskStatus.FAILED)
            self.assertIn("Audio channel decode error", t.error)

        asyncio.run(_test())


if __name__ == "__main__":
    unittest.main()
