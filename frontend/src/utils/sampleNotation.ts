import { NotationData } from '../types';

/**
 * Pre-loaded musical sample notation for instant preview in Apollo.
 * Demonstrates a 4-measure funk-rock bassline in D Minor with dynamic string/fret mappings.
 */
export const SAMPLE_NOTATION: Record<'beginner' | 'amateur' | 'pro', NotationData> = {
  beginner: {
    session_id: 'demo-sample-preview',
    stem: 'bass',
    difficulty: 'beginner',
    metadata: {
      key_signature: 'D Minor',
      time_signature: '4/4',
      tempo: 110,
      total_measures: 4,
      total_notes: 16,
      musicxml_file: 'sample_bass_beginner.musicxml',
    },
    measures: [
      {
        number: 1,
        notes: [
          { is_rest: false, pitch: 'D2', step: 'D', octave: 2, midi: 38, duration: 1.0, offset: 0.0, string: 2, fret: 0 },
          { is_rest: false, pitch: 'D2', step: 'D', octave: 2, midi: 38, duration: 1.0, offset: 1.0, string: 2, fret: 0 },
          { is_rest: false, pitch: 'F2', step: 'F', octave: 2, midi: 41, duration: 1.0, offset: 2.0, string: 2, fret: 3 },
          { is_rest: false, pitch: 'G2', step: 'G', octave: 2, midi: 43, duration: 1.0, offset: 3.0, string: 1, fret: 0 },
        ],
      },
      {
        number: 2,
        notes: [
          { is_rest: false, pitch: 'A2', step: 'A', octave: 2, midi: 45, duration: 1.0, offset: 0.0, string: 1, fret: 2 },
          { is_rest: false, pitch: 'C3', step: 'C', octave: 3, midi: 48, duration: 1.0, offset: 1.0, string: 1, fret: 5 },
          { is_rest: false, pitch: 'D3', step: 'D', octave: 3, midi: 50, duration: 1.0, offset: 2.0, string: 1, fret: 7 },
          { is_rest: true, duration: 1.0, offset: 3.0 },
        ],
      },
      {
        number: 3,
        notes: [
          { is_rest: false, pitch: 'D2', step: 'D', octave: 2, midi: 38, duration: 1.0, offset: 0.0, string: 2, fret: 0 },
          { is_rest: false, pitch: 'C2', step: 'C', octave: 2, midi: 36, duration: 1.0, offset: 1.0, string: 3, fret: 3 },
          { is_rest: false, pitch: 'A1', step: 'A', octave: 1, midi: 33, duration: 1.0, offset: 2.0, string: 3, fret: 0 },
          { is_rest: false, pitch: 'C2', step: 'C', octave: 2, midi: 36, duration: 1.0, offset: 3.0, string: 3, fret: 3 },
        ],
      },
      {
        number: 4,
        notes: [
          { is_rest: false, pitch: 'D2', step: 'D', octave: 2, midi: 38, duration: 2.0, offset: 0.0, string: 2, fret: 0 },
          { is_rest: false, pitch: 'G2', step: 'G', octave: 2, midi: 43, duration: 1.0, offset: 2.0, string: 1, fret: 0 },
          { is_rest: false, pitch: 'D2', step: 'D', octave: 2, midi: 38, duration: 1.0, offset: 3.0, string: 2, fret: 0 },
        ],
      },
    ],
  },
  amateur: {
    session_id: 'demo-sample-preview',
    stem: 'bass',
    difficulty: 'amateur',
    metadata: {
      key_signature: 'D Minor',
      time_signature: '4/4',
      tempo: 110,
      total_measures: 4,
      total_notes: 24,
      musicxml_file: 'sample_bass_amateur.musicxml',
    },
    measures: [
      {
        number: 1,
        notes: [
          { is_rest: false, pitch: 'D2', step: 'D', octave: 2, midi: 38, duration: 0.5, offset: 0.0, string: 2, fret: 0 },
          { is_rest: false, pitch: 'D2', step: 'D', octave: 2, midi: 38, duration: 0.5, offset: 0.5, string: 2, fret: 0 },
          { is_rest: false, pitch: 'F2', step: 'F', octave: 2, midi: 41, duration: 1.0, offset: 1.0, string: 2, fret: 3 },
          { is_rest: false, pitch: 'G2', step: 'G', octave: 2, midi: 43, duration: 0.5, offset: 2.0, string: 1, fret: 0 },
          { is_rest: false, pitch: 'Ab2', step: 'Ab', octave: 2, midi: 44, duration: 0.5, offset: 2.5, string: 1, fret: 1 },
          { is_rest: false, pitch: 'A2', step: 'A', octave: 2, midi: 45, duration: 1.0, offset: 3.0, string: 1, fret: 2 },
        ],
      },
      {
        number: 2,
        notes: [
          { is_rest: false, pitch: 'C3', step: 'C', octave: 3, midi: 48, duration: 0.5, offset: 0.0, string: 1, fret: 5 },
          { is_rest: false, pitch: 'D3', step: 'D', octave: 3, midi: 50, duration: 1.5, offset: 0.5, string: 1, fret: 7 },
          { is_rest: false, pitch: 'C3', step: 'C', octave: 3, midi: 48, duration: 0.5, offset: 2.0, string: 1, fret: 5 },
          { is_rest: false, pitch: 'A2', step: 'A', octave: 2, midi: 45, duration: 0.5, offset: 2.5, string: 1, fret: 2 },
          { is_rest: false, pitch: 'F2', step: 'F', octave: 2, midi: 41, duration: 1.0, offset: 3.0, string: 2, fret: 3 },
        ],
      },
      {
        number: 3,
        notes: [
          { is_rest: false, pitch: 'D2', step: 'D', octave: 2, midi: 38, duration: 0.5, offset: 0.0, string: 2, fret: 0 },
          { is_rest: false, pitch: 'D2', step: 'D', octave: 2, midi: 38, duration: 0.5, offset: 0.5, string: 2, fret: 0 },
          { is_rest: false, pitch: 'C2', step: 'C', octave: 2, midi: 36, duration: 1.0, offset: 1.0, string: 3, fret: 3 },
          { is_rest: false, pitch: 'A1', step: 'A', octave: 1, midi: 33, duration: 1.0, offset: 2.0, string: 3, fret: 0 },
          { is_rest: false, pitch: 'C2', step: 'C', octave: 2, midi: 36, duration: 1.0, offset: 3.0, string: 3, fret: 3 },
        ],
      },
      {
        number: 4,
        notes: [
          { is_rest: false, pitch: 'D2', step: 'D', octave: 2, midi: 38, duration: 1.5, offset: 0.0, string: 2, fret: 0 },
          { is_rest: false, pitch: 'F2', step: 'F', octave: 2, midi: 41, duration: 0.5, offset: 1.5, string: 2, fret: 3 },
          { is_rest: false, pitch: 'G2', step: 'G', octave: 2, midi: 43, duration: 0.5, offset: 2.0, string: 1, fret: 0 },
          { is_rest: false, pitch: 'A2', step: 'A', octave: 2, midi: 45, duration: 0.5, offset: 2.5, string: 1, fret: 2 },
          { is_rest: false, pitch: 'D2', step: 'D', octave: 2, midi: 38, duration: 1.0, offset: 3.0, string: 2, fret: 0 },
        ],
      },
    ],
  },
  pro: {
    session_id: 'demo-sample-preview',
    stem: 'bass',
    difficulty: 'pro',
    metadata: {
      key_signature: 'D Minor',
      time_signature: '4/4',
      tempo: 110,
      total_measures: 4,
      total_notes: 32,
      musicxml_file: 'sample_bass_pro.musicxml',
    },
    measures: [
      {
        number: 1,
        notes: [
          { is_rest: false, pitch: 'D2', step: 'D', octave: 2, midi: 38, duration: 0.25, offset: 0.0, string: 2, fret: 0 },
          { is_rest: false, pitch: 'D2', step: 'D', octave: 2, midi: 38, duration: 0.25, offset: 0.25, string: 2, fret: 0 },
          { is_rest: false, pitch: 'F2', step: 'F', octave: 2, midi: 41, duration: 0.5, offset: 0.5, string: 2, fret: 3 },
          { is_rest: false, pitch: 'F#2', step: 'F#', octave: 2, midi: 42, duration: 0.25, offset: 1.0, string: 2, fret: 4 },
          { is_rest: false, pitch: 'G2', step: 'G', octave: 2, midi: 43, duration: 0.5, offset: 1.25, string: 1, fret: 0 },
          { is_rest: false, pitch: 'Ab2', step: 'Ab', octave: 2, midi: 44, duration: 0.25, offset: 1.75, string: 1, fret: 1 },
          { is_rest: false, pitch: 'A2', step: 'A', octave: 2, midi: 45, duration: 1.0, offset: 2.0, string: 1, fret: 2 },
          { is_rest: false, pitch: 'C3', step: 'C', octave: 3, midi: 48, duration: 0.5, offset: 3.0, string: 1, fret: 5 },
          { is_rest: false, pitch: 'C#3', step: 'C#', octave: 3, midi: 49, duration: 0.5, offset: 3.5, string: 1, fret: 6 },
        ],
      },
      {
        number: 2,
        notes: [
          { is_rest: false, pitch: 'D3', step: 'D', octave: 3, midi: 50, duration: 1.0, offset: 0.0, string: 1, fret: 7 },
          { is_rest: false, pitch: 'D3', step: 'D', octave: 3, midi: 50, duration: 0.25, offset: 1.0, string: 1, fret: 7 },
          { is_rest: false, pitch: 'C3', step: 'C', octave: 3, midi: 48, duration: 0.25, offset: 1.25, string: 1, fret: 5 },
          { is_rest: false, pitch: 'A2', step: 'A', octave: 2, midi: 45, duration: 0.5, offset: 1.5, string: 1, fret: 2 },
          { is_rest: false, pitch: 'G2', step: 'G', octave: 2, midi: 43, duration: 0.5, offset: 2.0, string: 1, fret: 0 },
          { is_rest: false, pitch: 'F2', step: 'F', octave: 2, midi: 41, duration: 0.5, offset: 2.5, string: 2, fret: 3 },
          { is_rest: false, pitch: 'D2', step: 'D', octave: 2, midi: 38, duration: 1.0, offset: 3.0, string: 2, fret: 0 },
        ],
      },
      {
        number: 3,
        notes: [
          { is_rest: false, pitch: 'D2', step: 'D', octave: 2, midi: 38, duration: 0.5, offset: 0.0, string: 2, fret: 0 },
          { is_rest: false, pitch: 'F2', step: 'F', octave: 2, midi: 41, duration: 0.5, offset: 0.5, string: 2, fret: 3 },
          { is_rest: false, pitch: 'C2', step: 'C', octave: 2, midi: 36, duration: 0.5, offset: 1.0, string: 3, fret: 3 },
          { is_rest: false, pitch: 'B1', step: 'B', octave: 1, midi: 35, duration: 0.5, offset: 1.5, string: 3, fret: 2 },
          { is_rest: false, pitch: 'Bb1', step: 'Bb', octave: 1, midi: 34, duration: 0.5, offset: 2.0, string: 3, fret: 1 },
          { is_rest: false, pitch: 'A1', step: 'A', octave: 1, midi: 33, duration: 0.5, offset: 2.5, string: 3, fret: 0 },
          { is_rest: false, pitch: 'C2', step: 'C', octave: 2, midi: 36, duration: 1.0, offset: 3.0, string: 3, fret: 3 },
        ],
      },
      {
        number: 4,
        notes: [
          { is_rest: false, pitch: 'D2', step: 'D', octave: 2, midi: 38, duration: 1.25, offset: 0.0, string: 2, fret: 0 },
          { is_rest: false, pitch: 'A2', step: 'A', octave: 2, midi: 45, duration: 0.25, offset: 1.25, string: 1, fret: 2 },
          { is_rest: false, pitch: 'C3', step: 'C', octave: 3, midi: 48, duration: 0.5, offset: 1.5, string: 1, fret: 5 },
          { is_rest: false, pitch: 'D3', step: 'D', octave: 3, midi: 50, duration: 0.75, offset: 2.0, string: 1, fret: 7 },
          { is_rest: false, pitch: 'C3', step: 'C', octave: 3, midi: 48, duration: 0.25, offset: 2.75, string: 1, fret: 5 },
          { is_rest: false, pitch: 'D2', step: 'D', octave: 2, midi: 38, duration: 1.0, offset: 3.0, string: 2, fret: 0 },
        ],
      },
    ],
  },
};

