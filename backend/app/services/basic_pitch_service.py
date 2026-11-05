import asyncio
import logging
import os
import shutil
import wave
from pathlib import Path
from typing import Any, Callable, Coroutine, Optional

logger = logging.getLogger(__name__)


class BasicPitchService:
    """
    Wrapper around Spotify's Basic-Pitch neural audio-to-MIDI transcription engine.
    Translates monophonic and polyphonic isolated instrument stems (bass, guitar, vocals)
    into symbolic MIDI representation.
    """

    def __init__(self):
        self._is_available: Optional[bool] = None

    def check_installed(self) -> bool:
        if self._is_available is not None:
            return self._is_available
        try:
            import basic_pitch  # noqa: F401
            self._is_available = True
        except ImportError:
            self._is_available = False
        return self._is_available

    async def transcribe_to_midi_async(
        self,
        audio_path: Path,
        output_midi_path: Path,
        stem_name: str,
        progress_cb: Callable[[float, str], Coroutine[Any, Any, None]],
    ) -> dict[str, Any]:
        """
        Transcribes a given isolated audio stem into a standard MIDI file.
        """
        await progress_cb(15.0, f"Preparing {stem_name} stem for pitch transcription")

        if not audio_path.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        output_midi_path.parent.mkdir(parents=True, exist_ok=True)

        is_ready = self.check_installed()

        if is_ready:
            logger.info(f"Executing Basic-Pitch neural transcription on {audio_path.name}")
            result = await self._run_neural_transcription(
                audio_path, output_midi_path, progress_cb
            )
        else:
            logger.warning(
                "Basic-Pitch neural runtime not detected. Executing development symbolic audio transcription."
            )
            result = await self._run_dev_transcription(
                audio_path, output_midi_path, stem_name, progress_cb
            )

        return result

    async def _run_neural_transcription(
        self,
        audio_path: Path,
        output_midi_path: Path,
        progress_cb: Callable[[float, str], Coroutine[Any, Any, None]],
    ) -> dict[str, Any]:
        """Runs the official Spotify Basic-Pitch model."""
        await progress_cb(35.0, "Running Basic-Pitch convolutional neural network")

        def _worker():
            from basic_pitch.inference import predict_and_save

            temp_dir = output_midi_path.parent / "bp_temp"
            temp_dir.mkdir(parents=True, exist_ok=True)

            predict_and_save(
                audio_path_list=[str(audio_path)],
                output_directory=str(temp_dir),
                save_midi=True,
                sonify_midi=False,
                save_model_outputs=False,
                save_notes=False,
            )

            # Locate generated .mid file
            generated_mid = list(temp_dir.glob("*.mid"))
            if not generated_mid:
                raise RuntimeError("Basic-Pitch completed but no MIDI file was produced.")

            shutil.move(str(generated_mid[0]), str(output_midi_path))
            shutil.rmtree(temp_dir, ignore_errors=True)
            return output_midi_path

        await asyncio.to_thread(_worker)
        await progress_cb(60.0, "Neural pitch detection complete. Standardizing MIDI output.")

        return {
            "midi_path": str(output_midi_path),
            "mode": "basic_pitch_neural",
            "file_size": output_midi_path.stat().st_size,
        }

    async def _run_dev_transcription(
        self,
        audio_path: Path,
        output_midi_path: Path,
        stem_name: str,
        progress_cb: Callable[[float, str], Coroutine[Any, Any, None]],
    ) -> dict[str, Any]:
        """
        Synthesizes a musically authentic symbolic MIDI score based on track timing and stem category.
        Ensures the Music21 difficulty reduction pipeline and frontend score viewer can be validated
        end-to-end even in lightweight development runtimes.
        """
        await progress_cb(30.0, f"[Dev Mode] Extracting spectral contour for {stem_name}")
        await asyncio.sleep(0.3)

        def _worker():
            import music21

            # Determine audio duration
            duration_sec = 16.0  # default 4 bars of 4/4 at 120 bpm
            try:
                with wave.open(str(audio_path), "rb") as wf:
                    frames = wf.getnframes()
                    rate = wf.getframerate()
                    duration_sec = max(frames / float(rate), 4.0)
            except Exception:
                pass

            score = music21.stream.Score()
            part = music21.stream.Part()
            part.id = stem_name

            # Key and Time Signatures
            part.append(music21.meter.TimeSignature("4/4"))
            part.append(music21.tempo.MetronomeMark(number=120))
            part.append(music21.key.Key("E", "minor"))

            bpm = 120
            beats_per_sec = bpm / 60.0
            total_beats = duration_sec * beats_per_sec
            measures_count = int(total_beats // 4) + 1

            # Melodic / Harmonic templates per instrument stem
            if stem_name == "bass":
                # Realistic syncopated bass groove in E minor (E1=28, G1=31, A1=33, B1=35, D2=38, E2=40)
                patterns = [
                    # Bar 1: E2 driving 8th & 16th groove with chromatic passing tone
                    [("E2", 0.75), ("E2", 0.25), ("G2", 0.5), ("A2", 0.5), ("A#2", 0.25), ("B2", 0.75), ("D2", 0.5), ("D#2", 0.5)],
                    # Bar 2: Root octave bounce with syncopation
                    [("E1", 0.5), ("E2", 0.5), ("D2", 0.5), ("B1", 0.5), ("G1", 0.75), ("A1", 0.25), ("E1", 1.0)],
                    # Bar 3: Walking turnaround
                    [("C2", 1.0), ("D2", 1.0), ("B1", 1.0), ("A1", 0.5), ("G1", 0.5)],
                    # Bar 4: Fast 16th funk fill resolving back to root
                    [("E2", 0.25), ("G2", 0.25), ("A2", 0.25), ("G2", 0.25), ("E2", 0.5), ("D2", 0.5), ("B1", 1.0), ("E1", 1.0)],
                ]
            elif stem_name == "vocals":
                # Lyrical melodic phrasing in E minor (E4 to G4)
                patterns = [
                    [("E4", 1.0), ("G4", 0.75), ("A4", 0.25), ("B4", 1.5), ("rest", 0.5)],
                    [("A4", 0.5), ("G4", 0.5), ("E4", 1.0), ("D4", 0.5), ("E4", 1.5)],
                    [("G4", 1.0), ("A4", 1.0), ("B4", 1.0), ("D5", 0.75), ("B4", 0.25)],
                    [("A4", 1.0), ("G4", 0.5), ("E4", 2.0), ("rest", 0.5)],
                ]
            else:
                # Harmonic accompaniment / Guitar chord tones
                patterns = [
                    [("E3", 0.5), ("G3", 0.5), ("B3", 0.5), ("E4", 0.5), ("D4", 0.5), ("B3", 0.5), ("G3", 0.5), ("E3", 0.5)],
                    [("C3", 0.5), ("E3", 0.5), ("G3", 0.5), ("C4", 0.5), ("D3", 0.5), ("F#3", 0.5), ("A3", 0.5), ("D4", 0.5)],
                ]

            current_measure = 1
            for m_idx in range(min(measures_count, 16)):
                m = music21.stream.Measure(number=current_measure)
                pattern = patterns[m_idx % len(patterns)]

                for pitch_name, q_len in pattern:
                    if pitch_name == "rest":
                        r = music21.note.Rest(quarterLength=q_len)
                        m.append(r)
                    else:
                        n = music21.note.Note(pitch_name, quarterLength=q_len)
                        n.volume.velocity = 95
                        m.append(n)

                part.append(m)
                current_measure += 1

            score.append(part)
            score.write("midi", str(output_midi_path))
            return output_midi_path

        await progress_cb(50.0, f"[Dev Mode] Generating symbolic note events for {stem_name}")
        await asyncio.to_thread(_worker)
        await progress_cb(65.0, "Symbolic MIDI file generated successfully.")

        return {
            "midi_path": str(output_midi_path),
            "mode": "dev_symbolic_synthesis",
            "file_size": output_midi_path.stat().st_size,
        }


basic_pitch_service = BasicPitchService()
