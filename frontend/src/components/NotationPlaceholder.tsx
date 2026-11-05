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

interface NotationViewerProps {
  sessionId?: string;
  activeSessionFilename?: string;
  hasStems: boolean;
}

export const NotationPlaceholder: React.FC<NotationViewerProps> = ({
  sessionId,
  activeSessionFilename,
  hasStems,
}) => {
  const [selectedStem, setSelectedStem] = useState<StemType>('bass');
  const [difficulty, setDifficulty] = useState<'beginner' | 'amateur' | 'pro'>('amateur');
  const [notationStyle, setNotationStyle] = useState<'tab' | 'sheet'>('tab');

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
      <div className="notation-toolbar">
        <div className="toolbar-left">
          <div className="notation-title-group">
            <BookOpen size={18} className="toolbar-icon" />
            <h3 className="toolbar-title">Dynamic Score & Tablature</h3>
          </div>
          {activeSessionFilename && (
            <span className="track-tag">{activeSessionFilename}</span>
          )}
        </div>

        {/* Stem Selector Pills */}
        <div className="stem-selector-pills">
          {(['bass', 'vocals', 'other'] as StemType[]).map((stemId) => (
            <button
              key={stemId}
              type="button"
              className={`pill-btn ${selectedStem === stemId ? 'active' : ''}`}
              onClick={() => handleStemChange(stemId)}
              disabled={isLoading || !hasStems}
            >
              {stemId.charAt(0).toUpperCase() + stemId.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Control Matrix: Difficulty & Notation Mode */}
      <div className="notation-controls-bar">
        {/* Difficulty Scaling */}
        <div className="control-group">
          <span className="control-label">
            <SlidersHorizontal size={14} />
            <span>Difficulty Scaling:</span>
          </span>
          <div className="segmented-control">
            {(['beginner', 'amateur', 'pro'] as const).map((level) => (
              <button
                key={level}
                type="button"
                className={`seg-btn ${difficulty === level ? 'active' : ''}`}
                onClick={() => handleDifficultyChange(level)}
                disabled={isLoading || !hasStems}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tab vs Standard Sheet Music */}
        <div className="control-group">
          <span className="control-label">
            <Eye size={14} />
            <span>Style:</span>
          </span>
          <div className="segmented-control">
            <button
              type="button"
              className={`seg-btn ${notationStyle === 'tab' ? 'active' : ''}`}
              onClick={() => setNotationStyle('tab')}
            >
              Tablature (TAB)
            </button>
            <button
              type="button"
              className={`seg-btn ${notationStyle === 'sheet' ? 'active' : ''}`}
              onClick={() => setNotationStyle('sheet')}
            >
              Standard Notation
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
            {/* Metadata Banner */}
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
                <div className="download-actions">
                  <a
                    href={getNotationFileDownloadUrl(sessionId, selectedStem, 'midi')}
                    className="download-btn"
                    download
                    title="Download raw MIDI file"
                  >
                    <Download size={13} />
                    <span>MIDI</span>
                  </a>
                  <a
                    href={getNotationFileDownloadUrl(sessionId, selectedStem, 'musicxml', difficulty)}
                    className="download-btn"
                    download
                    title="Download MusicXML score"
                  >
                    <FileCode size={13} />
                    <span>MusicXML</span>
                  </a>
                </div>
              )}
            </div>

            {/* Dynamic Score / Tab Render */}
            <div className="measures-scroll-view">
              {notationStyle === 'tab' ? (
                /* Tablature Render */
                <div className="interactive-tab-score">
                  {notationData.measures.slice(0, 8).map((measure) => (
                    <div key={measure.number} className="tab-measure-block">
                      <div className="measure-header">Bar {measure.number}</div>
                      <div className="tab-grid">
                        <div className="tab-string-row">
                          <span className="tab-string-name">G |</span>
                          <span className="tab-notes-line">
                            {measure.notes.map((n, idx) =>
                              n.is_rest ? (
                                <span key={idx} className="tab-rest">-</span>
                              ) : n.string === 1 ? (
                                <span key={idx} className="tab-fret">{n.fret}</span>
                              ) : (
                                <span key={idx} className="tab-dash">-</span>
                              )
                            )}
                          </span>
                        </div>
                        <div className="tab-string-row">
                          <span className="tab-string-name">D |</span>
                          <span className="tab-notes-line">
                            {measure.notes.map((n, idx) =>
                              n.is_rest ? (
                                <span key={idx} className="tab-rest">-</span>
                              ) : n.string === 2 ? (
                                <span key={idx} className="tab-fret">{n.fret}</span>
                              ) : (
                                <span key={idx} className="tab-dash">-</span>
                              )
                            )}
                          </span>
                        </div>
                        <div className="tab-string-row">
                          <span className="tab-string-name">A |</span>
                          <span className="tab-notes-line">
                            {measure.notes.map((n, idx) =>
                              n.is_rest ? (
                                <span key={idx} className="tab-rest">-</span>
                              ) : n.string === 3 ? (
                                <span key={idx} className="tab-fret">{n.fret}</span>
                              ) : (
                                <span key={idx} className="tab-dash">-</span>
                              )
                            )}
                          </span>
                        </div>
                        <div className="tab-string-row">
                          <span className="tab-string-name">E |</span>
                          <span className="tab-notes-line">
                            {measure.notes.map((n, idx) =>
                              n.is_rest ? (
                                <span key={idx} className="tab-rest">-</span>
                              ) : n.string === 4 ? (
                                <span key={idx} className="tab-fret">{n.fret}</span>
                              ) : (
                                <span key={idx} className="tab-dash">-</span>
                              )
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Standard Notation Render */
                <div className="interactive-sheet-score">
                  {notationData.measures.slice(0, 8).map((measure) => (
                    <div key={measure.number} className="sheet-measure-block">
                      <div className="measure-header">Bar {measure.number}</div>
                      <div className="sheet-notes-row">
                        {measure.notes.map((n, idx) => (
                          <div
                            key={idx}
                            className={`score-note-chip ${n.is_rest ? 'rest-chip' : ''}`}
                            title={`Offset: ${n.offset}, Duration: ${n.duration} beat(s)`}
                          >
                            <span className="note-name">
                              {n.is_rest ? 'Rest' : n.pitch}
                            </span>
                            <span className="note-duration">
                              {n.duration === 1.0 ? '♩' : n.duration === 0.5 ? '♪' : '𝅘𝅥𝅯'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
              <span>Phase 2 Notation Engine Ready</span>
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
              <h4>Audio-to-MIDI & Symbolic Transcription Engine</h4>
              <p>
                {hasStems
                  ? 'Stems are loaded! Click below to transcribe the isolated audio stem into dynamic musical notation.'
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
