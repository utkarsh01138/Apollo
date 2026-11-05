import React, { useState } from 'react';
import { BookOpen, SlidersHorizontal, Eye, Sparkles } from 'lucide-react';
import { StemType } from '../types';

interface NotationPlaceholderProps {
  activeSessionFilename?: string;
  hasStems: boolean;
}

export const NotationPlaceholder: React.FC<NotationPlaceholderProps> = ({
  activeSessionFilename,
  hasStems,
}) => {
  const [selectedStem, setSelectedStem] = useState<StemType>('bass');
  const [difficulty, setDifficulty] = useState<'beginner' | 'amateur' | 'pro'>('amateur');
  const [notationStyle, setNotationStyle] = useState<'tab' | 'sheet'>('tab');

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

        {/* Stem Selector for Transcription */}
        <div className="stem-selector-pills">
          {(['bass', 'vocals', 'other'] as StemType[]).map((stemId) => (
            <button
              key={stemId}
              type="button"
              className={`pill-btn ${selectedStem === stemId ? 'active' : ''}`}
              onClick={() => setSelectedStem(stemId)}
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
                onClick={() => setDifficulty(level)}
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

      {/* Notation Canvas Area */}
      <div className="notation-canvas">
        <div className="staged-preview">
          <div className="preview-badge">
            <Sparkles size={16} />
            <span>Phase 4 Staged Renderer (AlphaTab / VexFlow)</span>
          </div>

          <div className="staff-graphic">
            {notationStyle === 'tab' ? (
              <div className="tab-lines">
                <span className="string-label">G |-----------------------5---7~-----|</span>
                <span className="string-label">D |-----------5---7---7h8------------|</span>
                <span className="string-label">A |--5---7---------------------------|</span>
                <span className="string-label">E |-----------------------------------|</span>
              </div>
            ) : (
              <div className="sheet-lines">
                <div className="staff-line"></div>
                <div className="staff-line"></div>
                <div className="staff-line"></div>
                <div className="staff-line"></div>
                <div className="staff-line"></div>
              </div>
            )}
          </div>

          <div className="placeholder-info">
            <h4>
              Selected Track: <span className="highlight-text">{selectedStem.toUpperCase()}</span>
            </h4>
            <p>
              {difficulty === 'beginner' &&
                'Beginner: Complex passing notes and trills are mathematically collapsed to primary 8th-note root pulses.'}
              {difficulty === 'amateur' &&
                'Amateur: Quantized to 16th-note grids with syncopation preserved, filtering hyper-speed ornamentation.'}
              {difficulty === 'pro' &&
                'Pro: 1:1 verbatim audio-to-MIDI transcription with complete polyphonic articulation.'}
            </p>
            <p className="pipeline-notice">
              {hasStems
                ? 'Stems ready in Jam Room! Next: Connect Spotify Basic-Pitch + Music21 pipeline to generate live MusicXML & AlphaTab tablature.'
                : 'Upload or drop a multi-track audio recording on the left to extract isolated stems and populate musical notation.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
