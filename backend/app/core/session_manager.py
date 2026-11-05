import json
import logging
import shutil
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from app.config import settings

logger = logging.getLogger(__name__)


class SessionManager:
    """
    Manages isolated on-disk storage lifecycle for audio decomposition sessions.
    Each session holds raw uploads, separated stems, extracted MIDI, and generated notation.
    """

    def __init__(self, base_storage_dir: Optional[Path] = None):
        self.storage_dir = base_storage_dir or settings.STORAGE_DIR
        self.sessions_dir = self.storage_dir / "sessions"
        self._ensure_storage_dirs()

    def _ensure_storage_dirs(self) -> None:
        self.sessions_dir.mkdir(parents=True, exist_ok=True)

    def create_session(self, original_filename: str) -> dict[str, Any]:
        """Creates a new unique session workspace directory tree."""
        session_id = str(uuid.uuid4())
        session_path = self.sessions_dir / session_id

        # Subdirectories for pipeline stages
        (session_path / "raw").mkdir(parents=True, exist_ok=True)
        (session_path / "stems").mkdir(parents=True, exist_ok=True)
        (session_path / "midi").mkdir(parents=True, exist_ok=True)
        (session_path / "notation").mkdir(parents=True, exist_ok=True)

        metadata = {
            "session_id": session_id,
            "original_filename": original_filename,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "created",
            "stems": {},
            "midi": {},
            "notation": {},
        }
        self.save_metadata(session_id, metadata)
        return metadata

    def get_session_dir(self, session_id: str) -> Path:
        return self.sessions_dir / session_id

    def session_exists(self, session_id: str) -> bool:
        session_dir = self.get_session_dir(session_id)
        return session_dir.exists() and session_dir.is_dir()

    def get_metadata_path(self, session_id: str) -> Path:
        return self.get_session_dir(session_id) / "metadata.json"

    def get_metadata(self, session_id: str) -> Optional[dict[str, Any]]:
        meta_path = self.get_metadata_path(session_id)
        if not meta_path.exists():
            return None
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to read metadata for session {session_id}: {e}")
            return None

    def save_metadata(self, session_id: str, metadata: dict[str, Any]) -> None:
        meta_path = self.get_metadata_path(session_id)
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

    def update_metadata(self, session_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        current = self.get_metadata(session_id) or {}
        current.update(updates)
        self.save_metadata(session_id, current)
        return current

    def get_raw_input_path(self, session_id: str) -> Optional[Path]:
        raw_dir = self.get_session_dir(session_id) / "raw"
        if not raw_dir.exists():
            return None
        files = list(raw_dir.iterdir())
        return files[0] if files else None

    def get_stem_path(self, session_id: str, stem_name: str) -> Path:
        """Returns expected path for a stem: vocals, bass, drums, other (e.g. bass.wav)"""
        clean_name = stem_name.lower().replace(".wav", "")
        return self.get_session_dir(session_id) / "stems" / f"{clean_name}.wav"

    def get_all_stems(self, session_id: str) -> dict[str, Path]:
        stems_dir = self.get_session_dir(session_id) / "stems"
        stems = {}
        if stems_dir.exists():
            for f in stems_dir.glob("*.wav"):
                stems[f.stem] = f
        return stems

    def cleanup_expired_sessions(self, max_age_hours: Optional[int] = None) -> int:
        """Purges sessions older than max_age_hours to prevent disk bloating."""
        age_hours = max_age_hours or settings.SESSION_EXPIRY_HOURS
        now = time.time()
        purged_count = 0

        for session_dir in self.sessions_dir.iterdir():
            if not session_dir.is_dir():
                continue
            try:
                dir_age_seconds = now - session_dir.stat().st_mtime
                if dir_age_seconds > (age_hours * 3600):
                    shutil.rmtree(session_dir)
                    purged_count += 1
                    logger.info(f"Purged expired session: {session_dir.name}")
            except Exception as e:
                logger.error(f"Error purging session directory {session_dir}: {e}")

        return purged_count


session_manager = SessionManager()
