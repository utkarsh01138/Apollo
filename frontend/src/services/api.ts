import { SessionInfo, TaskInfo } from '../types';

const API_BASE = '/api/v1';

export async function uploadAudioFile(file: File): Promise<{
  status: string;
  message: string;
  task_id: string;
  session_id: string;
  original_filename: string;
}> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/stems/extract`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Upload failed with HTTP ${response.status}`);
  }

  return response.json();
}

export async function fetchTaskStatus(taskId: string): Promise<TaskInfo> {
  const response = await fetch(`${API_BASE}/tasks/${taskId}`);
  if (!response.ok) {
    throw new Error(`Failed to query task status: HTTP ${response.status}`);
  }
  return response.json();
}

export async function fetchSession(sessionId: string): Promise<SessionInfo> {
  const response = await fetch(`${API_BASE}/stems/${sessionId}`);
  if (!response.ok) {
    throw new Error(`Failed to query session: HTTP ${response.status}`);
  }
  return response.json();
}

export function getStemUrl(sessionId: string, stemName: string): string {
  return `${API_BASE}/stems/${sessionId}/${stemName}`;
}
