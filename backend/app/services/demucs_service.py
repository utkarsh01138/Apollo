import asyncio
import logging
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any, Callable, Coroutine, Optional

from app.config import settings
from app.core.session_manager import session_manager

logger = logging.getLogger(__name__)

# Standard Demucs 4-stem naming convention
STEM_NAMES = ["vocals", "bass", "drums", "other"]


class DemucsService:
    """
    Wrapper around Meta's Demucs v4 music source separation engine.
    Separates a raw audio file into 4 uncompressed stereo stems: vocals, bass, drums, other.
    """

    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or settings.DEMUCS_MODEL
        self._is_torch_available: Optional[bool] = None

    def check_demucs_installed(self) -> bool:
        """Checks whether demucs and torch are importable in the active runtime."""
        if self._is_torch_available is not None:
            return self._is_torch_available
        try:
            import torch  # noqa: F401
            import demucs  # noqa: F401
            self._is_torch_available = True
        except ImportError:
            self._is_torch_available = False
        return self._is_torch_available

    async def separate_stems_async(
        self,
        session_id: str,
        input_audio_path: Path,
        progress_cb: Callable[[float, str], Coroutine[Any, Any, None]],
    ) -> dict[str, Any]:
        """
        Asynchronously runs stem separation for the given session.
        Dispatches to a thread pool to avoid blocking the event loop.
        """
        await progress_cb(10.0, "Preparing audio file for Demucs separation")

        if not input_audio_path.exists():
            raise FileNotFoundError(f"Input audio file not found: {input_audio_path}")

        session_dir = session_manager.get_session_dir(session_id)
        stems_dir = session_dir / "stems"
        stems_dir.mkdir(parents=True, exist_ok=True)

        is_demucs_ready = self.check_demucs_installed()

        if is_demucs_ready:
            logger.info(f"Running production Demucs v4 separation on {input_audio_path.name}")
            result = await self._run_demucs_pipeline(
                session_id, input_audio_path, stems_dir, progress_cb
            )
        else:
            logger.warning(
                "Demucs/PyTorch is not installed in current interpreter. Running development fallback synthesizer."
            )
            result = await self._run_dev_fallback(
                session_id, input_audio_path, stems_dir, progress_cb
            )

        # Update session metadata
        session_manager.update_metadata(
            session_id,
            {
                "status": "separated",
                "stems": {stem: str(path) for stem, path in result["stems"].items()},
                "model_used": self.model_name if is_demucs_ready else "dev_fallback",
            },
        )

        return result

    async def _run_demucs_pipeline(
        self,
        session_id: str,
        input_audio_path: Path,
        output_dir: Path,
        progress_cb: Callable[[float, str], Coroutine[Any, Any, None]],
    ) -> dict[str, Any]:
        """Executes actual Demucs separation via demucs python library or CLI."""
        await progress_cb(25.0, "Loading Demucs v4 neural model (htdemucs)")

        def _worker():
            # Run demucs command via Python module to support all operating systems
            import sys
            cmd = [
                sys.executable,
                "-m",
                "demucs.separate",
                "-n",
                self.model_name,
                "-o",
                str(output_dir.parent / "demucs_temp"),
                "--filename",
                "{stem}.{ext}",
                str(input_audio_path),
            ]
            
            # Use GPU if available
            if settings.DEMUCS_DEVICE == "cuda":
                cmd.extend(["-d", "cuda"])
            elif settings.DEMUCS_DEVICE == "cpu":
                cmd.extend(["-d", "cpu"])

            proc = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                check=False,
            )
            if proc.returncode != 0:
                raise RuntimeError(f"Demucs separation failed: {proc.stderr}")

            # Locate separated stems
            # Demucs creates: demucs_temp/{model_name}/{track_stem}/{stem}.wav
            temp_out = output_dir.parent / "demucs_temp" / self.model_name / input_audio_path.stem
            stems_found = {}
            for stem in STEM_NAMES:
                src_stem = temp_out / f"{stem}.wav"
                dst_stem = output_dir / f"{stem}.wav"
                if src_stem.exists():
                    shutil.move(str(src_stem), str(dst_stem))
                    stems_found[stem] = dst_stem

            # Clean up temp folder
            shutil.rmtree(output_dir.parent / "demucs_temp", ignore_errors=True)
            return stems_found

        await progress_cb(40.0, "Decomposing audio into 4 stems (Vocals, Bass, Drums, Other)")
        stems_dict = await asyncio.to_thread(_worker)
        await progress_cb(90.0, "Finalizing stem audio buffers")

        return {
            "session_id": session_id,
            "stems": stems_dict,
            "mode": "demucs_v4",
            "model": self.model_name,
        }

    async def _run_dev_fallback(
        self,
        session_id: str,
        input_audio_path: Path,
        output_dir: Path,
        progress_cb: Callable[[float, str], Coroutine[Any, Any, None]],
    ) -> dict[str, Any]:
        """
        Development fallback: when PyTorch/Demucs is not yet installed in the current environment,
        this produces valid audio stems (using FFmpeg or audio copies) so the full API, frontend mixer,
        and audio player workflow can be developed and validated seamlessly.
        """
        await progress_cb(30.0, "[Dev Mode] Processing audio channels with FFmpeg")
        await asyncio.sleep(0.5)

        stems_dict = {}
        for idx, stem in enumerate(STEM_NAMES):
            stem_path = output_dir / f"{stem}.wav"
            # Use ffmpeg to convert or duplicate the input file as a stereo WAV for the stem
            cmd = [
                "ffmpeg",
                "-y",
                "-i",
                str(input_audio_path),
                "-vn",
                "-ac",
                "2",
                "-ar",
                "44100",
                str(stem_path),
            ]
            try:
                subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            except Exception:
                # If ffmpeg is not available, copy file directly as fallback
                shutil.copy2(input_audio_path, stem_path)

            stems_dict[stem] = stem_path
            progress = 30.0 + (idx + 1) * 15.0
            await progress_cb(progress, f"[Dev Mode] Generated mock stem: {stem}")

        return {
            "session_id": session_id,
            "stems": stems_dict,
            "mode": "dev_fallback",
            "notice": "Demucs neural models are running in development mode. Install PyTorch + Demucs for production isolation.",
        }


demucs_service = DemucsService()
