export type StemType = 'vocals' | 'bass' | 'drums' | 'other';

export interface StemTrack {
  id: StemType;
  label: string;
  color: string;
  volume: number; // 0.0 to 1.0
  isMuted: boolean;
  isSolo: boolean;
  isLoaded: boolean;
  url: string;
}

export interface SessionInfo {
  session_id: string;
  original_filename: string;
  status: string;
  created_at?: string;
  stems_available: string[];
  stem_urls: Record<string, string>;
}

export interface TaskInfo {
  task_id: string;
  task_type: string;
  session_id: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  stage: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  result?: {
    session_id?: string;
    stems?: Record<string, string>;
    mode?: string;
    [key: string]: any;
  };
  error?: string;
}

export interface NotationNote {
  is_rest: boolean;
  is_chord?: boolean;
  pitch?: string;
  step?: string;
  octave?: number;
  midi?: number;
  duration: number;
  offset: number;
  string?: number;
  fret?: number;
  velocity?: number;
  pitches?: Array<{ pitch: string; midi: number; string: number; fret: number }>;
}

export interface NotationMeasure {
  number: number;
  notes: NotationNote[];
}

export interface NotationData {
  session_id: string;
  stem: string;
  difficulty: 'beginner' | 'amateur' | 'pro';
  metadata: {
    key_signature: string;
    time_signature: string;
    tempo: number;
    total_measures: number;
    total_notes: number;
    musicxml_file: string;
  };
  measures: NotationMeasure[];
}
