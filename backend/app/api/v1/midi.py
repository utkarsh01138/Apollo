import json
import logging
from pathlib import Path
from typing import Any, Optional
from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.core.session_manager import session_manager
from app.core.task_manager import task_manager
from app.services.basic_pitch_service import basic_pitch_service
from app.services.demucs_service import STEM_NAMES
from app.services.notation_service import notation_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/midi", tags=["MIDI & Notation"])


class TranscribeRequest(BaseModel):
    session_id: str
    stem_name: str = "bass"


@router.post("/transcribe", status_code=status.HTTP_202_ACCEPTED)
async def transcribe_stem(request: TranscribeRequest):
    """
    Initiates asynchronous audio-to-MIDI transcription and Music21 symbolic notation
    processing on an isolated instrument stem.
    Decoupled from HTTP cycle to prevent browser connection timeouts.
    """
    session_id = request.session_id
    stem_name = request.stem_name.lower().replace(".wav", "")

    if not session_manager.session_exists(session_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found.",
        )

    if stem_name not in STEM_NAMES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid stem '{stem_name}'. Must be one of: {', '.join(STEM_NAMES)}",
        )

    stem_audio_path = session_manager.get_stem_path(session_id, stem_name)
    if not stem_audio_path.exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stem '{stem_name}.wav' has not been extracted yet for session '{session_id}'.",
        )

    # Output paths
    session_dir = session_manager.get_session_dir(session_id)
    raw_midi_path = session_dir / "midi" / f"{stem_name}_raw.mid"
    notation_dir = session_dir / "notation"

    # Enqueue background transcription task
    task_info = task_manager.create_task(
        task_type="stem_transcription",
        session_id=session_id,
        metadata={"stem": stem_name, "audio_file": stem_audio_path.name},
    )

    async def transcription_worker(task_id: str, progress_cb):
        # Step 1: Basic-Pitch transcription
        await progress_cb(10.0, f"Initializing pitch detection for {stem_name}...")
        bp_result = await basic_pitch_service.transcribe_to_midi_async(
            audio_path=stem_audio_path,
            output_midi_path=raw_midi_path,
            stem_name=stem_name,
            progress_cb=progress_cb,
        )

        # Step 2: Music21 symbolic parsing & difficulty scaling
        await progress_cb(70.0, f"Parsing MIDI with Music21 and applying difficulty reduction...")
        notation_results = await asyncio.to_thread(
            notation_service.process_midi_notation,
            midi_path=raw_midi_path,
            session_id=session_id,
            stem_name=stem_name,
            output_dir=notation_dir,
        )

        await progress_cb(95.0, "Finalizing notation structures...")

        # Update session metadata
        session_manager.update_metadata(
            session_id,
            {
                f"midi_{stem_name}": str(raw_midi_path),
                f"notation_{stem_name}": {
                    diff: str(notation_dir / f"{stem_name}_{diff}.json")
                    for diff in ["beginner", "amateur", "pro"]
                },
            },
        )

        return {
            "session_id": session_id,
            "stem": stem_name,
            "midi_file": str(raw_midi_path),
            "difficulties_available": ["beginner", "amateur", "pro"],
            "notation_summary": {
                diff: {
                    "total_measures": data["metadata"]["total_measures"],
                    "total_notes": data["metadata"]["total_notes"],
                }
                for diff, data in notation_results.items()
            },
        }

    import asyncio
    task_manager.run_coroutine(task_info.task_id, transcription_worker)

    return {
        "status": "accepted",
        "message": f"Transcription for stem '{stem_name}' queued.",
        "task_id": task_info.task_id,
        "session_id": session_id,
        "stem": stem_name,
    }


@router.get("/{session_id}/notation", response_model=dict[str, Any])
async def get_notation_data(
    session_id: str,
    stem: str = Query("bass", description="Instrument stem to fetch notation for"),
    difficulty: str = Query("amateur", description="Difficulty tier: beginner, amateur, or pro"),
):
    """
    Retrieves the structured musical notation JSON payload for interactive
    sheet music and tablature rendering.
    """
    if not session_manager.session_exists(session_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found.",
        )

    clean_diff = difficulty.lower()
    if clean_diff not in ["beginner", "amateur", "pro"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Difficulty must be 'beginner', 'amateur', or 'pro'.",
        )

    clean_stem = stem.lower().replace(".wav", "")
    notation_file = session_manager.get_session_dir(session_id) / "notation" / f"{clean_stem}_{clean_diff}.json"

    if not notation_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notation for stem '{clean_stem}' at difficulty '{clean_diff}' has not been generated yet. Call POST /api/v1/midi/transcribe first.",
        )

    try:
        with open(notation_file, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error reading notation file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to read notation data.",
        )


@router.get("/{session_id}/file")
async def download_notation_file(
    session_id: str,
    stem: str = Query("bass", description="Stem name"),
    format: str = Query("midi", description="File format: midi or musicxml"),
    difficulty: str = Query("amateur", description="Difficulty for musicxml"),
):
    """
    Downloads raw MIDI or MusicXML score files for external DAW or notation software usage.
    """
    if not session_manager.session_exists(session_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    clean_stem = stem.lower().replace(".wav", "")
    session_dir = session_manager.get_session_dir(session_id)

    if format.lower() == "midi":
        file_path = session_dir / "midi" / f"{clean_stem}_raw.mid"
        if not file_path.exists():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MIDI file not found.")
        return FileResponse(
            path=str(file_path),
            media_type="audio/midi",
            filename=f"{clean_stem}.mid",
        )
    elif format.lower() == "musicxml":
        diff = difficulty.lower()
        file_path = session_dir / "notation" / f"{clean_stem}_{diff}.musicxml"
        if not file_path.exists():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MusicXML file not found.")
        return FileResponse(
            path=str(file_path),
            media_type="application/vnd.recordare.musicxml+xml",
            filename=f"{clean_stem}_{diff}.musicxml",
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format must be 'midi' or 'musicxml'.",
        )

