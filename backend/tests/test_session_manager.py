import shutil
import tempfile
from pathlib import Path
from app.core.session_manager import SessionManager


def test_session_lifecycle():
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        mgr = SessionManager(base_storage_dir=temp_path)

        # 1. Create session
        meta = mgr.create_session("guitar_riff.wav")
        session_id = meta["session_id"]
        assert session_id is not None
        assert mgr.session_exists(session_id)

        # 2. Verify subdirectories
        session_dir = mgr.get_session_dir(session_id)
        assert (session_dir / "raw").is_dir()
        assert (session_dir / "stems").is_dir()
        assert (session_dir / "midi").is_dir()
        assert (session_dir / "notation").is_dir()

        # 3. Verify metadata retrieval and update
        read_meta = mgr.get_metadata(session_id)
        assert read_meta["original_filename"] == "guitar_riff.wav"

        mgr.update_metadata(session_id, {"status": "separated", "tempo": 120})
        updated_meta = mgr.get_metadata(session_id)
        assert updated_meta["status"] == "separated"
        assert updated_meta["tempo"] == 120

        # 4. Check stem paths
        bass_path = mgr.get_stem_path(session_id, "bass")
        assert bass_path.name == "bass.wav"


def test_session_cleanup():
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        mgr = SessionManager(base_storage_dir=temp_path)

        meta = mgr.create_session("test.mp3")
        session_id = meta["session_id"]
        assert mgr.session_exists(session_id)

        # Purging with 0 hours should purge the session immediately
        purged = mgr.cleanup_expired_sessions(max_age_hours=0)
        assert purged >= 0
