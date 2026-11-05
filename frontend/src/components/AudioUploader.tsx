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
          <div className="processing-state">
            <Loader2 className="spinner-icon" size={40} />
            <h3 className="processing-title">Demucs v4 Neural Separation</h3>
            <p className="processing-subtitle">{stageMessage}</p>
            
            <div className="progress-container">
              <div
                className="progress-bar"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <span className="progress-percent">{Math.round(progress)}%</span>
          </div>
        ) : (
          <div className="empty-state">
            <div className="icon-badge">
              <UploadCloud size={32} />
            </div>
            <h3 className="dropzone-title">Drop your multi-track audio here</h3>
            <p className="dropzone-subtitle">
              Supports <strong>MP3, WAV, FLAC, OGG, M4A</strong> up to 100MB
            </p>
            <button type="button" className="browse-button">
              <Music size={16} />
              <span>Select Audio File</span>
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
