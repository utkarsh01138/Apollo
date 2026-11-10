import logging
import shutil
from pathlib import Path
from typing import Any
from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.config import settings
from app.core.session_manager import session_manager
from app.core.task_manager import task_manager
from app.services.demucs_service import STEM_NAMES, demucs_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/stems", tags=["Stems"])


@router.post("/extract", status_code=status.HTTP_202_ACCEPTED)
async def extract_stems(file: UploadFile = File(...)):
    """
    Ingests a raw audio file (MP3, WAV, FLAC, OGG, M4A), establishes an isolated
    session directory, and dispatches Demucs v4 stem separation asynchronously.
    Returns 202 Accepted with a task_id for progress polling.
    """
    original_filename = file.filename or "uploaded_track.mp3"
    file_ext = Path(original_filename).suffix.lower()

    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{file_ext}'. Allowed formats: {', '.join(settings.ALLOWED_EXTENSIONS)}",
        )

    # 1. Create session directory
    session_data = session_manager.create_session(original_filename)
    session_id = session_data["session_id"]
    session_dir = session_manager.get_session_dir(session_id)

    # 2. Save raw input audio
    raw_dest = session_dir / "raw" / f"input{file_ext}"
    try:
        with open(raw_dest, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Failed to write uploaded file to disk: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save incoming audio file.",
        )
    finally:
        file.file.close()

    # 3. Create async background task
    task_info = task_manager.create_task(
        task_type="demucs_separation",
        session_id=session_id,
        metadata={"filename": original_filename, "size_bytes": raw_dest.stat().st_size},
    )

    # 4. Dispatch separation worker
    async def separation_worker(task_id: str, progress_cb):
        return await demucs_service.separate_stems_async(
            session_id=session_id,
            input_audio_path=raw_dest,
            progress_cb=progress_cb,
        )

    task_manager.run_coroutine(task_info.task_id, separation_worker)

    return {
        "status": "accepted",
        "message": "Stem separation queued successfully.",
        "task_id": task_info.task_id,
        "session_id": session_id,
        "original_filename": original_filename,
    }


@router.get("/{session_id}", response_model=dict[str, Any])
async def get_session_stems(session_id: str):
    """
    Retrieves metadata and stem URLs for an existing session.
    """
    if not session_manager.session_exists(session_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found.",
        )

    meta = session_manager.get_metadata(session_id) or {}
    stems = session_manager.get_all_stems(session_id)

    stem_urls = {
        stem_name: f"{settings.API_V1_STR}/stems/{session_id}/{stem_name}"
        for stem_name in stems.keys()
    }

    return {
        "session_id": session_id,
        "original_filename": meta.get("original_filename"),
        "status": meta.get("status", "unknown"),
        "created_at": meta.get("created_at"),
        "stems_available": list(stems.keys()),
        "stem_urls": stem_urls,
    }


@router.get("/{session_id}/{stem_name}")
async def stream_stem_audio(session_id: str, stem_name: str):
    """
    Streams the uncompressed WAV audio of an isolated stem for playback in the Jam Room mixer.
    Supported stems: vocals, bass, drums, other.
    """
    clean_stem = stem_name.lower().replace(".wav", "")
    if clean_stem not in STEM_NAMES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid stem '{stem_name}'. Must be one of: {', '.join(STEM_NAMES)}",
        )

    stem_path = session_manager.get_stem_path(session_id, clean_stem)
    if not stem_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stem '{stem_name}' not found for session '{session_id}'.",
        )

    return FileResponse(
        path=str(stem_path),
        media_type="audio/wav",
        filename=f"{clean_stem}.wav",
    )
