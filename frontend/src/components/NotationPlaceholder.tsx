import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  SlidersHorizontal,
  Eye,
  Sparkles,
  Download,
  Loader2,
  FileCode,
  AlertCircle,
  Grid,
  FileText,
} from 'lucide-react';
import { NotationData, StemType } from '../types';
import {
  triggerTranscription,
  fetchTaskStatus,
  fetchNotationData,
  getNotationFileDownloadUrl,
} from '../services/api';
import { AlphaTabRenderer } from './AlphaTabRenderer';
import { SAMPLE_NOTATION } from '../utils/sampleNotation';

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
  const [viewTab, setViewTab] = useState<'score' | 'inspector'>('score');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [stageMessage, setStageMessage] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  // Default to sample notation so the right panel immediately displays rich musical content
  const [notationData, setNotationData] = useState<NotationData>(SAMPLE_NOTATION.amateur);
  const [isDemoData, setIsDemoData] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Transcribe stem & fetch notation
  const handleTranscribe = async (stem: StemType, diff: 'beginner' | 'amateur' | 'pro') => {
    if (!sessionId) return;
    setError(null);
    setIsLoading(true);
    setProgress(10);
    setStageMessage(`Analyzing audio frequencies for ${stem.toUpperCase()} stem...`);

    try {
      const { task_id } = await triggerTranscription(sessionId, stem);

      // Poll task status until complete
      const poll = setInterval(async () => {
        try {
          const task = await fetchTaskStatus(task_id);
          setProgress(task.progress || 20);
          setStageMessage(task.stage || 'Transcribing pitch & rhythm with Basic-Pitch...');

          if (task.status === 'completed') {
            clearInterval(poll);
            setIsLoading(false);
            // Fetch parsed notation
            const data = await fetchNotationData(sessionId, stem, diff);
            setNotationData(data);
            setIsDemoData(false);
          } else if (task.status === 'failed') {
            clearInterval(poll);
            setIsLoading(false);
            setError(task.error || 'Audio-to-MIDI transcription failed.');
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

    if (isDemoData) {
      setNotationData(SAMPLE_NOTATION[newDiff]);
      return;
    }

    if (!sessionId) return;

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
    if (sessionId && hasStems) {
      handleTranscribe(newStem, difficulty);
    } else {
      // In demo mode, adjust stem
      setNotationData({
        ...SAMPLE_NOTATION[difficulty],
        stem: newStem,
      });
    }
  };

  // Auto-transcribe bass stem when session first becomes available
  useEffect(() => {
    if (sessionId && hasStems) {
      handleTranscribe('bass', 'amateur');
    }
  }, [sessionId, hasStems]);

  // Calculate active bar based on current playback time
  const tempo = notationData?.metadata?.tempo || 120;
  const beatsPerSec = tempo / 60.0;
  const currentBeat = currentTime * beatsPerSec;
  const activeMeasureNumber = Math.floor(currentBeat / 4.0) + 1;

  return (
    <div className="notation-card nothing-notation-card">
      {/* Top Toolbar */}
      <div className="notation-toolbar nothing-toolbar">
        <div className="toolbar-left">
          <div className="notation-title-group">
            <BookOpen size={17} className="toolbar-icon" />
            <h3 className="toolbar-title nothing-font-dot">DYNAMIC SCORE // TABLATURE</h3>
          </div>
          {isDemoData ? (
            <span className="demo-indicator-pill nothing-font-mono">
              PREVIEW // SAMPLE D-MINOR GROOVE
            </span>
          ) : activeSessionFilename ? (
            <span className="track-tag nothing-tag">{activeSessionFilename}</span>
          ) : null}
        </div>

        {/* Stem Selector Pills */}
        <div className="stem-selector-pills nothing-pills">
          {(['bass', 'vocals', 'other'] as StemType[]).map((stemId) => (
            <button
              key={stemId}
              type="button"
              className={`pill-btn nothing-pill-btn ${selectedStem === stemId ? 'active' : ''}`}
              onClick={() => handleStemChange(stemId)}
              disabled={isLoading}
              title={`View notation for ${stemId.toUpperCase()}`}
            >
              <span className="stem-dot-indicator" />
              <span>{stemId.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Control Matrix: Difficulty & View Toggles */}
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
                disabled={isLoading}
              >
                {level.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* View Switcher: Vector Score vs Measure Inspector */}
        <div className="control-group">
          <span className="control-label nothing-control-label">
            <Eye size={13} />
            <span>MODE:</span>
          </span>
          <div className="segmented-control nothing-segmented">
            <button
              type="button"
              className={`seg-btn nothing-seg-btn ${viewTab === 'score' ? 'active' : ''}`}
              onClick={() => setViewTab('score')}
              title="Publication-quality SVG stave & tablature"
            >
              <FileText size={12} className="btn-inline-icon" />
              <span>SCORE</span>
            </button>
            <button
              type="button"
              className={`seg-btn nothing-seg-btn ${viewTab === 'inspector' ? 'active' : ''}`}
              onClick={() => setViewTab('inspector')}
              title="Measure-by-measure note & fret breakdown"
            >
              <Grid size={12} className="btn-inline-icon" />
              <span>MEASURES</span>
            </button>
          </div>
        </div>

        {/* Sub-view: Tab vs Sheet (When in Score View) */}
        {viewTab === 'score' && (
          <div className="control-group">
            <div className="segmented-control nothing-segmented sub-segmented">
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
        )}
      </div>

      {/* Musical Intelligence & Telemetry Dashboard */}
      <div className="telemetry-dashboard-bar">
        <div className="telemetry-pill">
          <span className="telemetry-label">KEY:</span>
          <span className="telemetry-val">{notationData.metadata.key_signature}</span>
        </div>
        <div className="telemetry-pill">
          <span className="telemetry-label">METER:</span>
          <span className="telemetry-val">{notationData.metadata.time_signature}</span>
        </div>
        <div className="telemetry-pill">
          <span className="telemetry-label">TEMPO:</span>
          <span className="telemetry-val">{notationData.metadata.tempo} BPM</span>
        </div>
        <div className="telemetry-pill">
          <span className="telemetry-label">BARS:</span>
          <span className="telemetry-val">{notationData.metadata.total_measures || notationData.measures.length}</span>
        </div>
        <div className="telemetry-pill">
          <span className="telemetry-label">NOTES:</span>
          <span className="telemetry-val">{notationData.metadata.total_notes}</span>
        </div>
        <div className="telemetry-pill">
          <span className="telemetry-label">TUNING:</span>
          <span className="telemetry-val">
            {selectedStem === 'bass' ? 'G2 · D2 · A1 · E1' : 'E4 · B3 · G3 · D3 · A2 · E2'}
          </span>
        </div>

        {/* File Exports */}
        <div id="export-section" className="download-actions nothing-download-actions">
          {sessionId ? (
            <>
              <a
                href={getNotationFileDownloadUrl(sessionId, selectedStem, 'midi')}
                className="download-btn nothing-download-btn"
                download
                title="Download raw MIDI file"
              >
                <Download size={12} />
                <span>MIDI</span>
              </a>
              <a
                href={getNotationFileDownloadUrl(sessionId, selectedStem, 'musicxml', difficulty)}
                className="download-btn nothing-download-btn"
                download
                title="Download MusicXML score"
              >
                <FileCode size={12} />
                <span>MUSICXML</span>
              </a>
            </>
          ) : (
            <span className="demo-notice-tag nothing-font-mono">EXPORTS // ACTIVE POST-UPLOAD</span>
          )}
        </div>
      </div>

      {/* Main Notation Display Area */}
      <div className="notation-canvas nothing-notation-canvas">
        {isLoading ? (
          <div className="staged-preview nothing-staged-preview">
            <div className="nothing-processing-indicator">
              <Loader2 className="spinner-icon nothing-spinner" size={36} />
              <span className="nothing-led-dot red-pulse" />
            </div>
            <h4 className="nothing-font-dot">BASIC-PITCH & MUSIC21 PIPELINE</h4>
            <p className="processing-subtitle nothing-font-mono">{stageMessage}</p>
            <div className="progress-container nothing-progress-container">
              <div className="progress-bar nothing-progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <span className="progress-percent nothing-font-mono">{Math.round(progress)}%</span>
          </div>
        ) : viewTab === 'score' ? (
          /* Mode 1: High-Resolution Vector AlphaTab Score */
          <div className="notation-display-container">
            <AlphaTabRenderer
              notationData={notationData}
              notationStyle={notationStyle}
              currentTime={currentTime}
              isPlaying={isPlaying}
            />

            {/* Difficulty Tier Explanation Banner */}
            <div className="difficulty-insight nothing-difficulty-insight">
              <Sparkles size={14} className="insight-icon" />
              <span>
                {difficulty === 'beginner' &&
                  'BEGINNER TIER: Quantized to 8th and quarter note roots. Complex syncopations and passing tones simplified for accessible practice.'}
                {difficulty === 'amateur' &&
                  'AMATEUR TIER: 16th-note rhythmic grid applied. Grooves and syncopated riffs preserved with micro-ornaments filtered.'}
                {difficulty === 'pro' &&
                  'PRO TIER: 1:1 verbatim transcription capturing micro-rhythmic precision and exact performance nuances.'}
              </span>
            </div>
          </div>
        ) : (
          /* Mode 2: Measure Inspector & Tab Matrix Breakdown */
          <div className="measures-inspector-view">
            <div className="measures-grid-container">
              {notationData.measures.map((measure) => {
                const isCurrentMeasure = isPlaying && measure.number === activeMeasureNumber;

                return (
                  <div
                    key={measure.number}
                    className={`measure-matrix-card ${isCurrentMeasure ? 'active-playhead-bar' : ''}`}
                  >
                    <div className="measure-card-header">
                      <span className="measure-num nothing-font-mono">
                        BAR_{measure.number.toString().padStart(2, '0')}
                      </span>
                      {isCurrentMeasure && (
                        <span className="live-bar-indicator">
                          <span className="nothing-led-dot red-pulse" />
                          <span>PLAYING</span>
                        </span>
                      )}
                    </div>

                    <div className="measure-notes-stream">
                      {measure.notes && measure.notes.length > 0 ? (
                        measure.notes.map((note, noteIdx) => {
                          if (note.is_rest) {
                            return (
                              <div key={noteIdx} className="note-chip rest-chip">
                                <span className="chip-note-name">REST</span>
                                <span className="chip-duration">{note.duration}b</span>
                              </div>
                            );
                          }

                          return (
                            <div key={noteIdx} className="note-chip active-note-chip">
                              <span className="chip-note-name">{note.pitch || 'NOTE'}</span>
                              <div className="chip-fret-badge">
                                <span className="chip-string">STR {note.string || 2}</span>
                                <span className="chip-fret">FRET {note.fret !== undefined ? note.fret : 0}</span>
                              </div>
                              <span className="chip-duration nothing-font-mono">{note.duration}b</span>
                            </div>
                          );
                        })
                      ) : (
                        <span className="empty-measure-text">Whole Rest</span>
                      )}
                    </div>
                  </div>
                );
              })}
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
