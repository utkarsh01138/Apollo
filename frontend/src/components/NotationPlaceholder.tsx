import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  SlidersHorizontal,
  Eye,
  Sparkles,
  Download,
  Loader2,
  FileCode,
  Music2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { NotationData, StemType } from '../types';
import {
  triggerTranscription,
  fetchTaskStatus,
  fetchNotationData,
  getNotationFileDownloadUrl,
} from '../services/api';
import { AlphaTabRenderer } from './AlphaTabRenderer';

interface NotationViewerProps {
  sessionId?: string;
  activeSessionFilename?: string;
  hasStems: boolean;
  currentTime?: number;
  isPlaying?: boolean;
}

export const NotationPlaceholder: React.FC<NotationViewerProps> = ({
  sessionId,
  activeSessionFilename,
  hasStems,
  currentTime = 0,
  isPlaying = false,
}) => {
  const [selectedStem, setSelectedStem] = useState<StemType>('bass');
  const [difficulty, setDifficulty] = useState<'beginner' | 'amateur' | 'pro'>('amateur');
  const [notationStyle, setNotationStyle] = useState<'tab' | 'sheet' | 'both'>('both');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [stageMessage, setStageMessage] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [notationData, setNotationData] = useState<NotationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Transcribe stem & fetch notation
  const handleTranscribe = async (stem: StemType, diff: 'beginner' | 'amateur' | 'pro') => {
    if (!sessionId) return;
    setError(null);
    setIsLoading(true);
    setProgress(10);
    setStageMessage(`Starting pitch detection for ${stem}...`);

    try {
      const { task_id } = await triggerTranscription(sessionId, stem);

      // Poll task status until complete
      const poll = setInterval(async () => {
        try {
          const task = await fetchTaskStatus(task_id);
          setProgress(task.progress || 20);
          setStageMessage(task.stage || 'Transcribing audio...');

          if (task.status === 'completed') {
            clearInterval(poll);
            setIsLoading(false);
            // Fetch parsed notation
            const data = await fetchNotationData(sessionId, stem, diff);
            setNotationData(data);
          } else if (task.status === 'failed') {
            clearInterval(poll);
            setIsLoading(false);
            setError(task.error || 'Transcription failed.');
          }
        } catch (err: any) {
          clearInterval(poll);
          setIsLoading(false);
          setError(err.message || 'Error checking task status.');
        }
      }, 700);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Failed to start transcription.');
    }
  };

  // Change difficulty for currently transcribed stem
  const handleDifficultyChange = async (newDiff: 'beginner' | 'amateur' | 'pro') => {
    setDifficulty(newDiff);
    if (!sessionId || !notationData) return;

    try {
      const data = await fetchNotationData(sessionId, selectedStem, newDiff);
      setNotationData(data);
    } catch (err) {
      // If not yet generated, re-run
      handleTranscribe(selectedStem, newDiff);
    }
  };

  // Switch stem
  const handleStemChange = (newStem: StemType) => {
    setSelectedStem(newStem);
    setNotationData(null);
    if (sessionId) {
      handleTranscribe(newStem, difficulty);
    }
  };

  // Auto-transcribe bass stem when session first becomes available
  useEffect(() => {
    if (sessionId && hasStems && !notationData && !isLoading) {
      handleTranscribe('bass', 'amateur');
    }
  }, [sessionId, hasStems]);

  return (
    <div className="notation-card">
      {/* Top Toolbar */}
      <div className="notation-toolbar nothing-toolbar">
        <div className="toolbar-left">
          <div className="notation-title-group">
            <BookOpen size={16} className="toolbar-icon" />
            <h3 className="toolbar-title nothing-font-dot">DYNAMIC SCORE // TABLATURE</h3>
          </div>
          {activeSessionFilename && (
            <span className="track-tag nothing-tag">{activeSessionFilename}</span>
          )}
        </div>

        {/* Stem Selector Pills */}
        <div className="stem-selector-pills nothing-pills">
          {(['bass', 'vocals', 'other'] as StemType[]).map((stemId) => (
            <button
              key={stemId}
              type="button"
              className={`pill-btn nothing-pill-btn ${selectedStem === stemId ? 'active' : ''}`}
              onClick={() => handleStemChange(stemId)}
              disabled={isLoading || !hasStems}
            >
              <span className="stem-dot-indicator" />
              <span>{stemId.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Control Matrix: Difficulty & Notation Mode */}
      <div id="difficulty-controls" className="notation-controls-bar nothing-controls-bar">
        {/* Difficulty Scaling */}
        <div className="control-group">
          <span className="control-label nothing-control-label">
            <SlidersHorizontal size={13} />
            <span>DIFFICULTY:</span>
          </span>
          <div className="segmented-control nothing-segmented">
            {(['beginner', 'amateur', 'pro'] as const).map((level) => (
              <button
                key={level}
                type="button"
                className={`seg-btn nothing-seg-btn ${difficulty === level ? 'active' : ''}`}
                onClick={() => handleDifficultyChange(level)}
                disabled={isLoading || !hasStems}
              >
                {level.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Style Selector: Tab vs Standard Sheet Music vs Both */}
        <div className="control-group">
          <span className="control-label nothing-control-label">
            <Eye size={13} />
            <span>VIEW:</span>
          </span>
          <div className="segmented-control nothing-segmented">
            <button
              type="button"
              className={`seg-btn nothing-seg-btn ${notationStyle === 'both' ? 'active' : ''}`}
              onClick={() => setNotationStyle('both')}
            >
              SCORE + TAB
            </button>
            <button
              type="button"
              className={`seg-btn nothing-seg-btn ${notationStyle === 'tab' ? 'active' : ''}`}
              onClick={() => setNotationStyle('tab')}
            >
              TAB ONLY
            </button>
            <button
              type="button"
              className={`seg-btn nothing-seg-btn ${notationStyle === 'sheet' ? 'active' : ''}`}
              onClick={() => setNotationStyle('sheet')}
            >
              SCORE
            </button>
          </div>
        </div>
      </div>

      {/* Notation Content / Render Area */}
      <div className="notation-canvas">
        {isLoading ? (
          <div className="staged-preview">
            <Loader2 className="spinner-icon" size={36} />
            <h4>Basic-Pitch & Music21 Pipeline</h4>
            <p className="processing-subtitle">{stageMessage}</p>
            <div className="progress-container">
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <span className="progress-percent">{Math.round(progress)}%</span>
          </div>
        ) : notationData ? (
          <div className="notation-display-container">
            {/* Metadata Banner & File Downloads */}
            <div className="notation-metadata-banner">
              <div className="meta-pill">
                <strong>Key:</strong> {notationData.metadata.key_signature}
              </div>
              <div className="meta-pill">
                <strong>Meter:</strong> {notationData.metadata.time_signature}
              </div>
              <div className="meta-pill">
                <strong>Tempo:</strong> {notationData.metadata.tempo} BPM
              </div>
              <div className="meta-pill">
                <strong>Notes:</strong> {notationData.metadata.total_notes}
              </div>
              <div className="meta-pill tier-pill">
                <strong>Tier:</strong> {difficulty.toUpperCase()}
              </div>

              {/* Download Buttons */}
              {sessionId && (
                <div id="export-section" className="download-actions nothing-download-actions">
                  <a
                    href={getNotationFileDownloadUrl(sessionId, selectedStem, 'midi')}
                    className="download-btn nothing-download-btn"
                    download
                    title="Download raw MIDI file"
                  >
                    <Download size={13} />
                    <span>MIDI</span>
                  </a>
                  <a
                    href={getNotationFileDownloadUrl(sessionId, selectedStem, 'musicxml', difficulty)}
                    className="download-btn nothing-download-btn"
                    download
                    title="Download MusicXML score"
                  >
                    <FileCode size={13} />
                    <span>MUSICXML</span>
                  </a>
                </div>
              )}
            </div>

            {/* Dynamic AlphaTab Vector Score Rendering */}
            <AlphaTabRenderer
              notationData={notationData}
              notationStyle={notationStyle}
              currentTime={currentTime}
              isPlaying={isPlaying}
            />

            {/* Difficulty Summary Info */}
            <div className="difficulty-insight">
              <Sparkles size={14} className="insight-icon" />
              <span>
                {difficulty === 'beginner' &&
                  'Beginner Tier: Notes quantized to 8th/quarter roots; fast passing tones and chords simplified.'}
                {difficulty === 'amateur' &&
                  'Amateur Tier: 16th-note grid quantization applied; syncopation preserved with ornaments filtered.'}
                {difficulty === 'pro' &&
                  'Pro Tier: Unfiltered 1:1 transcription showing complete micro-rhythmic precision.'}
              </span>
            </div>
          </div>
        ) : (
          /* Empty / Initial State */
          <div className="staged-preview">
            <div className="preview-badge">
              <Music2 size={16} />
              <span>AlphaTab Vector Engine Ready</span>
            </div>

            <div className="staff-graphic">
              <div className="tab-lines">
                <span className="string-label">G |-----------------------5---7~-----|</span>
                <span className="string-label">D |-----------5---7---7h8------------|</span>
                <span className="string-label">A |--5---7---------------------------|</span>
                <span className="string-label">E |-----------------------------------|</span>
              </div>
            </div>

            <div className="placeholder-info">
              <h4>Audio-to-MIDI & Vector Notation Engine</h4>
              <p>
                {hasStems
                  ? 'Stems are ready in the Jam Room! Click below to transcribe the isolated stem and render vector sheet music & tablature.'
                  : 'Upload an audio file on the left to extract stems and generate dynamic sheet music & tablature.'}
              </p>

              {hasStems && sessionId && (
                <button
                  type="button"
                  className="browse-button"
                  onClick={() => handleTranscribe(selectedStem, difficulty)}
                >
                  <RefreshCw size={15} />
                  <span>Transcribe {selectedStem.toUpperCase()} Track</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="error-alert mt-4">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
