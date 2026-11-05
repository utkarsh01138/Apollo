import React, { useState, useRef } from 'react';
import { UploadCloud, Music, AlertCircle, Loader2 } from 'lucide-react';
import { uploadAudioFile, fetchTaskStatus, fetchSession } from '../services/api';
import { SessionInfo } from '../types';

interface AudioUploaderProps {
  onSessionLoaded: (session: SessionInfo) => void;
}

const ALLOWED_EXTS = ['.mp3', '.wav', '.flac', '.ogg', '.m4a'];

export const AudioUploader: React.FC<AudioUploaderProps> = ({ onSessionLoaded }) => {
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
          setStageMessage(task.stage || 'Decomposing audio...');

          if (task.status === 'completed') {
            clearInterval(pollInterval);
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
      }, 800);
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

  return (
    <div className="uploader-card">
      <div
        className={`dropzone ${isDragging ? 'dragging' : ''} ${isProcessing ? 'processing' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".mp3,.wav,.flac,.ogg,.m4a"
          style={{ display: 'none' }}
          disabled={isProcessing}
        />

        {isProcessing ? (
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
            <span className="progress-percent nothing-font-mono">{Math.round(progress)}%</span>
          </div>
        ) : (
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
        )}
      </div>

      {errorMessage && (
        <div className="error-alert">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
