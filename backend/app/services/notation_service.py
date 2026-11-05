import logging
from pathlib import Path
from typing import Any, Optional

import music21

logger = logging.getLogger(__name__)

# Standard 4-String Bass Tuning (MIDI pitch numbers)
# String 1: G2 (43), String 2: D2 (38), String 3: A1 (33), String 4: E1 (28)
BASS_STRINGS = [
    (1, 43),  # G string
    (2, 38),  # D string
    (3, 33),  # A string
    (4, 28),  # E string
]

# Standard 6-String Guitar Tuning
# 1: E4 (64), 2: B3 (59), 3: G3 (55), 4: D3 (50), 5: A2 (45), 6: E2 (40)
GUITAR_STRINGS = [
    (1, 64),  # High E
    (2, 59),  # B
    (3, 55),  # G
    (4, 50),  # D
    (5, 45),  # A
    (6, 40),  # Low E
]


def map_midi_to_tab(midi_pitch: int, is_bass: bool = True) -> tuple[int, int]:
    """
    Computes optimal string (1-indexed from highest to lowest string)
    and fret number (0-24) for a given MIDI pitch.
    """
    strings = BASS_STRINGS if is_bass else GUITAR_STRINGS

    # Find the highest pitch open string that is <= target pitch
    best_string = strings[-1][0]
    best_fret = max(0, midi_pitch - strings[-1][1])

    for string_num, open_pitch in strings:
        fret = midi_pitch - open_pitch
        if 0 <= fret <= 24:
            # Prefer comfortable lower frets (0 to 12)
            if fret <= 12:
                return (string_num, fret)
            best_string = string_num
            best_fret = fret

    return (best_string, min(max(0, best_fret), 24))


class NotationService:
    """
    Symbolic Music21 processing engine.
    Parses raw MIDI, quantizes rhythmic structures, calculates key/time signatures,
    and applies progressive difficulty reduction algorithms (Beginner, Amateur, Pro).
    """

    def process_midi_notation(
        self,
        midi_path: Path,
        session_id: str,
        stem_name: str,
        output_dir: Path,
    ) -> dict[str, Any]:
        """
        Parses MIDI and generates structured JSON and MusicXML representations
        for all three difficulty tiers (beginner, amateur, pro).
        """
        if not midi_path.exists():
            raise FileNotFoundError(f"MIDI file not found: {midi_path}")

        output_dir.mkdir(parents=True, exist_ok=True)

        # 1. Parse MIDI stream via music21
        score = music21.converter.parse(str(midi_path))

        # 2. Extract global score metadata
        key_sig = "Unknown"
        try:
            analyzed_key = score.analyze("key")
            key_sig = f"{analyzed_key.tonic.name} {analyzed_key.mode}"
        except Exception:
            pass

        time_sig = "4/4"
        try:
            ts_list = score.flatten().getElementsByClass(music21.meter.TimeSignature)
            if ts_list:
                time_sig = ts_list[0].ratioString
        except Exception:
            pass

        tempo_val = 120
        try:
            tempos = score.flatten().getElementsByClass(music21.tempo.MetronomeMark)
            if tempos:
                tempo_val = int(tempos[0].number)
        except Exception:
            pass

        # 3. Process the 3 difficulty variations
        difficulty_tiers = ["pro", "amateur", "beginner"]
        results = {}

        for diff in difficulty_tiers:
            transformed_score = self._apply_difficulty_scaling(score, diff, stem_name)

            # Export MusicXML file
            xml_filename = f"{stem_name}_{diff}.musicxml"
            xml_path = output_dir / xml_filename
            try:
                transformed_score.write("musicxml", str(xml_path))
            except Exception as e:
                logger.warning(f"Could not export MusicXML for {stem_name}_{diff}: {e}")

            # Export structured JSON payload
            json_payload = self._convert_to_structured_json(
                score=transformed_score,
                session_id=session_id,
                stem_name=stem_name,
                difficulty=diff,
                key_sig=key_sig,
                time_sig=time_sig,
                tempo_val=tempo_val,
                xml_filename=xml_filename,
            )

            # Save JSON to disk
            json_path = output_dir / f"{stem_name}_{diff}.json"
            import json
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(json_payload, f, indent=2)

            results[diff] = json_payload

        return results

    def _apply_difficulty_scaling(
        self,
        score: music21.stream.Score,
        difficulty: str,
        stem_name: str,
    ) -> music21.stream.Score:
        """
        Progressive difficulty reduction algorithm:
        - Pro: 1:1 verbatim note representation.
        - Amateur: 16th-note quantization, filters fast non-harmonic passing tones (< 0.25 beats).
        - Beginner: 8th/quarter note root reduction, collapses chords to single root bass note.
        """
        import copy

        if difficulty == "pro":
            # Return unchanged verbatim copy
            return copy.deepcopy(score)

        scaled = copy.deepcopy(score)
        is_bass = "bass" in stem_name.lower()

        for part in scaled.parts:
            # Flatten part to manipulate note streams
            measures = part.getElementsByClass(music21.stream.Measure)

            for measure in measures:
                notes_to_keep = []
                last_note_pitch = None

                for element in measure.notesAndRests:
                    if element.isRest:
                        if difficulty == "beginner" and element.quarterLength < 0.5:
                            continue  # Strip tiny micro-rests in beginner mode
                        notes_to_keep.append(element)
                        continue

                    if element.isChord:
                        if difficulty == "beginner":
                            # In beginner mode, collapse polyphonic chord to the lowest root note
                            root_pitch = min(p.midi for p in element.pitches)
                            root_note = music21.note.Note(root_pitch, quarterLength=max(element.quarterLength, 0.5))
                            notes_to_keep.append(root_note)
                        else:
                            notes_to_keep.append(element)
                        continue

                    if element.isNote:
                        note = element
                        q_len = note.quarterLength

                        if difficulty == "beginner":
                            # Beginner Rule 1: Filter out rapid 16th/32nd passing tones (< 0.5 beats)
                            if q_len < 0.5:
                                continue

                            # Beginner Rule 2: Quantize to 8th/quarter note grid (0.5 or 1.0)
                            quantized_len = round(q_len * 2) / 2.0
                            note.quarterLength = max(0.5, quantized_len)
                            notes_to_keep.append(note)

                        elif difficulty == "amateur":
                            # Amateur Rule 1: Filter ultra-short ornaments (< 0.2 beats)
                            if q_len < 0.2:
                                continue

                            # Amateur Rule 2: Quantize to 16th-note grid (0.25 beat intervals)
                            quantized_len = round(q_len * 4) / 4.0
                            note.quarterLength = max(0.25, quantized_len)
                            notes_to_keep.append(note)

                # Rebuild measure elements
                measure.elements = tuple(notes_to_keep)

        return scaled

    def _convert_to_structured_json(
        self,
        score: music21.stream.Score,
        session_id: str,
        stem_name: str,
        difficulty: str,
        key_sig: str,
        time_sig: str,
        tempo_val: int,
        xml_filename: str,
    ) -> dict[str, Any]:
        """Serializes music21 score into clean structured notation JSON for web rendering."""
        is_bass = "bass" in stem_name.lower()
        measures_data = []
        total_notes = 0

        # Traverse measures
        for part in score.parts:
            for measure in part.getElementsByClass(music21.stream.Measure):
                m_notes = []

                for el in measure.notesAndRests:
                    if el.isRest:
                        m_notes.append({
                            "is_rest": True,
                            "pitch": "Rest",
                            "duration": float(el.quarterLength),
                            "offset": float(el.offset),
                        })
                    elif el.isNote:
                        total_notes += 1
                        str_num, fret_num = map_midi_to_tab(el.pitch.midi, is_bass=is_bass)
                        m_notes.append({
                            "is_rest": False,
                            "pitch": el.pitch.nameWithOctave,
                            "step": el.pitch.step,
                            "octave": el.pitch.octave,
                            "midi": el.pitch.midi,
                            "duration": float(el.quarterLength),
                            "offset": float(el.offset),
                            "string": str_num,
                            "fret": fret_num,
                            "velocity": int(el.volume.velocity or 90),
                        })
                    elif el.isChord:
                        total_notes += len(el.pitches)
                        chord_notes = []
                        for p in el.pitches:
                            s, f = map_midi_to_tab(p.midi, is_bass=is_bass)
                            chord_notes.append({
                                "pitch": p.nameWithOctave,
                                "midi": p.midi,
                                "string": s,
                                "fret": f,
                            })
                        m_notes.append({
                            "is_rest": False,
                            "is_chord": True,
                            "pitches": chord_notes,
                            "duration": float(el.quarterLength),
                            "offset": float(el.offset),
                        })

                measures_data.append({
                    "number": measure.number,
                    "notes": m_notes,
                })

        return {
            "session_id": session_id,
            "stem": stem_name,
            "difficulty": difficulty,
            "metadata": {
                "key_signature": key_sig,
                "time_signature": time_sig,
                "tempo": tempo_val,
                "total_measures": len(measures_data),
                "total_notes": total_notes,
                "musicxml_file": xml_filename,
            },
            "measures": measures_data,
        }


notation_service = NotationService()

