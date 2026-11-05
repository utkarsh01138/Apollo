import asyncio
import tempfile
from pathlib import Path
import music21

from app.services.basic_pitch_service import BasicPitchService
from app.services.notation_service import NotationService, map_midi_to_tab


def test_map_midi_to_tab():
    # Standard bass open strings: E1=28, A1=33, D2=38, G2=43
    # E1 open -> string 4, fret 0
    s4, f0 = map_midi_to_tab(28, is_bass=True)
    assert s4 == 4
    assert f0 == 0

    # A1 open -> string 3, fret 0
    s3, f0 = map_midi_to_tab(33, is_bass=True)
    assert s3 == 3
    assert f0 == 0

    # G2 open -> string 1, fret 0
    s1, f0 = map_midi_to_tab(43, is_bass=True)
    assert s1 == 1
    assert f0 == 0

    # E2 (MIDI 40) on D string (38) is fret 2
    s_e2, f_e2 = map_midi_to_tab(40, is_bass=True)
    assert f_e2 == 2


def test_notation_difficulty_scaling_pipeline():
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        midi_path = temp_path / "bass_raw.mid"
        output_dir = temp_path / "notation"

        bp_service = BasicPitchService()
        notation_svc = NotationService()

        # Generate MIDI via transcription service
        async def dummy_progress(p, s):
            pass

        dummy_audio = temp_path / "bass.wav"
        dummy_audio.write_bytes(b"RIFF" + b"\x00" * 300)

        asyncio.run(
            bp_service.transcribe_to_midi_async(
                audio_path=dummy_audio,
                output_midi_path=midi_path,
                stem_name="bass",
                progress_cb=dummy_progress,
            )
        )

        assert midi_path.exists()
        assert midi_path.stat().st_size > 0

        # Process notation for all 3 difficulties
        results = notation_svc.process_midi_notation(
            midi_path=midi_path,
            session_id="test_session",
            stem_name="bass",
            output_dir=output_dir,
        )

        assert "pro" in results
        assert "amateur" in results
        assert "beginner" in results

        pro_notes = results["pro"]["metadata"]["total_notes"]
        amateur_notes = results["amateur"]["metadata"]["total_notes"]
        beginner_notes = results["beginner"]["metadata"]["total_notes"]

        # Progressive difficulty rule: Beginner should have <= Amateur <= Pro notes
        assert beginner_notes <= amateur_notes
        assert amateur_notes <= pro_notes

        # Verify MusicXML files generated
        assert (output_dir / "bass_pro.musicxml").exists()
        assert (output_dir / "bass_beginner.musicxml").exists()

        # Check measures structure in JSON
        first_measure = results["beginner"]["measures"][0]
        assert "notes" in first_measure
        assert len(first_measure["notes"]) > 0

        # Check tablature attributes on notes
        first_note = first_measure["notes"][0]
        if not first_note.get("is_rest"):
            assert "string" in first_note
            assert "fret" in first_note
            assert 1 <= first_note["string"] <= 4
            assert 0 <= first_note["fret"] <= 24
