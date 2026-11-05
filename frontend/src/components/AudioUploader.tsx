import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Music,
  AlertCircle,
  Loader2,
  CheckCircle2,
  RefreshCw,
  ArrowDownCircle,
} from 'lucide-react';
import { uploadAudioFile, fetchTaskStatus, fetchSession } from '../services/api';
import { SessionInfo } from '../types';

interface AudioUploaderProps {
  onSessionLoaded: (session: SessionInfo) => void;
  currentSession?: SessionInfo | null;
  onResetUpload?: () => void;
}

const ALLOWED_EXTS = ['.mp3', '.wav', '.flac', '.ogg', '.m4a'];

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  onSessionLoaded,
  currentSession,
  onResetUpload,
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [stageMessage, setStageMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processFile = async (file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      setErrorMessage(`Unsupported format "${ext}". Please upload an MP3, WAV, FLAC, OGG, or M4A file.`);
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setProgress(5);
    setStageMessage('Uploading audio file to local engine...');

    try {
      // 1. Upload audio to FastAPI backend
      const uploadResult = await uploadAudioFile(file);
      const taskId = uploadResult.task_id;
      const sessionId = uploadResult.session_id;

      // 2. Poll task status until complete
      const pollInterval = setInterval(async () => {
        try {
          const task = await fetchTaskStatus(taskId);
          setProgress(task.progress || 10);
          setStageMessage(task.stage || 'Decomposing audio into isolated stems...');

          if (task.status === 'completed') {
            clearInterval(pollInterval);
            setProgress(100);
            setStageMessage('Separation complete! Initializing Jam Room mixer...');

            // 3. Fetch completed session metadata
            const session = await fetchSession(sessionId);
            setIsProcessing(false);
            onSessionLoaded(session);
          } else if (task.status === 'failed' || task.status === 'cancelled') {
            clearInterval(pollInterval);
            setIsProcessing(false);
            setErrorMessage(task.error || 'Audio stem separation failed.');
          }
        } catch (err: any) {
          clearInterval(pollInterval);
          setIsProcessing(false);
          setErrorMessage(err.message || 'Error checking task status.');
        }
      }, 750);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Failed to initiate stem extraction.');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleScrollToMixer = () => {
    const el = document.getElementById('mixer-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="uploader-card nothing-uploader-card">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".mp3,.wav,.flac,.ogg,.m4a"
        style={{ display: 'none' }}
        disabled={isProcessing}
      />

      {isProcessing ? (
        /* Processing State with Live Telemetry */
        <div className="dropzone processing nothing-dropzone-processing">
          <div className="processing-state nothing-processing-state">
            <div className="nothing-processing-indicator">
              <Loader2 className="spinner-icon nothing-spinner" size={32} />
              <span className="nothing-led-dot red-pulse" />
            </div>
            <h3 className="processing-title nothing-font-dot">DEMUCS V4 // NEURAL SEPARATION</h3>
            <p className="processing-subtitle nothing-font-mono">{stageMessage}</p>

            <div className="progress-container nothing-progress-container">
              <div
                className="progress-bar nothing-progress-bar"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <div className="processing-footer">
              <span className="progress-percent nothing-font-mono">{Math.round(progress)}%</span>
              <span className="processing-meta nothing-font-mono">PYTORCH_CUDA_HTDEMUCS</span>
            </div>
          </div>
        </div>
      ) : currentSession ? (
        /* Prominent Success State: Track Successfully Uploaded & Decomposed */
        <div
          className={`dropzone track-loaded-zone ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="loaded-track-banner">
            <div className="loaded-status-row">
              <span className="success-status-pill">
                <CheckCircle2 size={14} className="success-icon" />
                <span>4_STEMS // DECOMPOSED & SYNCED</span>
              </span>
              <span className="session-id-pill nothing-font-mono">
                SESSION: {currentSession.session_id.slice(0, 8)}
              </span>
            </div>

            <div className="loaded-track-meta">
              <div className="track-icon-wrapper">
                <Music size={24} className="loaded-music-icon" />
              </div>
              <div className="track-details">
                <h3 className="loaded-track-name">{currentSession.original_filename}</h3>
                <p className="loaded-track-sub">
                  Local offline separation completed. Stems routed to The Jam Room mixer and ready for notation.
                </p>
              </div>
            </div>

            {/* Stem Isolation Grid */}
            <div className="stems-status-grid">
              {(currentSession.stems_available && currentSession.stems_available.length > 0
                ? currentSession.stems_available
                : ['vocals', 'bass', 'drums', 'other']
              ).map((stem) => (
                <div key={stem} className="stem-status-chip">
                  <span className="chip-led-dot" />
                  <span className="chip-name">{stem.toUpperCase()}</span>
                  <span className="chip-status">ISOLATED</span>
                </div>
              ))}
            </div>

            {/* Quick Action Matrix */}
            <div className="loaded-action-bar">
              <button
                type="button"
                className="nothing-pill-btn secondary"
                onClick={() => {
                  if (onResetUpload) onResetUpload();
                  fileInputRef.current?.click();
                }}
                title="Drop or select another audio file"
              >
                <RefreshCw size={13} />
                <span>REPLACE / UPLOAD NEW</span>
              </button>

              <button
                type="button"
                className="nothing-pill-btn primary"
                onClick={handleScrollToMixer}
                title="Jump to the Jam Room Audio Mixer"
              >
                <ArrowDownCircle size={14} />
                <span>OPEN IN JAM ROOM</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty Idle Dropzone State */
        <div
          className={`dropzone ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="empty-state nothing-empty-state">
            <div className="icon-badge nothing-icon-badge">
              <UploadCloud size={28} />
            </div>
            <h3 className="dropzone-title nothing-font-dot">DROP MULTI-TRACK AUDIO HERE</h3>
            <p className="dropzone-subtitle nothing-font-mono">
              SUPPORTS <strong>MP3 // WAV // FLAC // OGG // M4A</strong> (MAX 100MB)
            </p>
            <button type="button" className="browse-button nothing-pill-btn primary">
              <Music size={15} />
              <span>SELECT AUDIO FILE</span>
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="error-alert">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
