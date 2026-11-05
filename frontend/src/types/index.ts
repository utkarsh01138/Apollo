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
