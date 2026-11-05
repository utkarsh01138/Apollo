import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Mic2,
  Disc,
  Activity,
  Music,
  Gauge,
} from 'lucide-react';
import { StemTrack, StemType } from '../types';

interface JamRoomMixerProps {
  stems: StemTrack[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  masterVolume: number;
  playbackRate: number;
  isLoadingStems: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onReset: () => void;
  onMasterVolumeChange: (vol: number) => void;
  onPlaybackRateChange: (rate: number) => void;
  onSetStemVolume: (stemId: StemType, vol: number) => void;
  onToggleMute: (stemId: StemType) => void;
  onToggleSolo: (stemId: StemType) => void;
}

const STEM_ICONS: Record<StemType, React.ReactNode> = {
  vocals: <Mic2 size={18} />,
  bass: <Activity size={18} />,
  drums: <Disc size={18} />,
  other: <Music size={18} />,
};

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const JamRoomMixer: React.FC<JamRoomMixerProps> = ({
  stems,
  isPlaying,
  currentTime,
  duration,
  masterVolume,
  playbackRate,
  isLoadingStems,
  onTogglePlay,
  onSeek,
  onReset,
  onMasterVolumeChange,
  onPlaybackRateChange,
  onSetStemVolume,
  onToggleMute,
  onToggleSolo,
}) => {
  const hasAnySolo = stems.some((s) => s.isSolo);

  return (
    <div className="mixer-container">
      {/* Top Master Transport Bar */}
      <div className="master-transport nothing-transport">
        <div className="transport-left">
          <button
            type="button"
            className={`play-button nothing-play-button ${isPlaying ? 'playing' : ''}`}
            onClick={onTogglePlay}
            disabled={isLoadingStems || duration === 0}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} className="play-icon-offset" />}
          </button>

          <button
            type="button"
            className="control-button nothing-control-button"
            onClick={onReset}
            disabled={isLoadingStems || duration === 0}
            aria-label="Restart playback"
            title="Reset to start"
          >
            <RotateCcw size={16} />
          </button>

          <div className="time-display nothing-time-display">
            <span className="current-time nothing-font-mono">{formatTime(currentTime)}</span>
            <span className="time-separator">//</span>
            <span className="total-time nothing-font-mono">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Global Timeline Scrubber */}
        <div className="timeline-wrapper nothing-timeline">
          <label htmlFor="timeline-scrubber" className="sr-only">
            Timeline Scrubber
          </label>
          <input
            id="timeline-scrubber"
            type="range"
            className="apollo-range timeline-slider nothing-range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            style={
              {
                '--control-value': currentTime,
                '--attr-min': 0,
                '--attr-max': duration || 100,
                '--slider-progress': `${duration ? (currentTime / duration) * 100 : 0}%`,
              } as React.CSSProperties
            }
            disabled={isLoadingStems || duration === 0}
          />
        </div>

        {/* Master Controls & Tempo */}
        <div className="transport-right">
          {/* Tempo Multiplier */}
          <div className="tempo-selector nothing-tempo">
            <Gauge size={14} className="tempo-icon" />
            <select
              value={playbackRate}
              onChange={(e) => onPlaybackRateChange(parseFloat(e.target.value))}
              className="tempo-dropdown nothing-tempo-select"
              aria-label="Playback speed"
            >
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1.0}>1.0x (Normal)</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
            </select>
          </div>

          {/* Master Volume */}
          <div className="master-volume nothing-master-volume">
            <button
              type="button"
              className="mute-button nothing-vol-button"
              onClick={() => onMasterVolumeChange(masterVolume > 0 ? 0 : 0.9)}
              aria-label={masterVolume === 0 ? 'Unmute master' : 'Mute master'}
            >
              {masterVolume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input
              type="range"
              className="apollo-range master-slider nothing-range"
              min={0}
              max={1}
              step={0.01}
              value={masterVolume}
              onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value))}
              aria-label="Master volume"
              style={
                {
                  '--control-value': masterVolume * 100,
                  '--attr-min': 0,
                  '--attr-max': 100,
                  '--slider-progress': `${masterVolume * 100}%`,
                } as React.CSSProperties
              }
            />
          </div>
        </div>
      </div>

      {/* Stem Mixer Channel Matrix */}
      <div className="stem-channels-grid nothing-channels-grid">
        {stems.map((stem, index) => {
          const isAudible = hasAnySolo
            ? stem.isSolo && !stem.isMuted
            : !stem.isMuted && stem.volume > 0;

          return (
            <div
              key={stem.id}
              className={`stem-channel-card nothing-channel-card ${!isAudible ? 'attenuated' : ''} ${
                stem.isSolo ? 'solo-active' : ''
              }`}
              style={{ '--stem-accent': stem.color } as React.CSSProperties}
            >
              {/* Channel Header */}
              <div className="channel-header nothing-channel-header">
                <div className="stem-icon-badge nothing-icon-pill">
                  {STEM_ICONS[stem.id]}
                </div>
                <div className="stem-meta">
                  <h4 className="stem-title nothing-font-dot">{stem.label}</h4>
                  <span className="stem-badge nothing-font-mono">CH_{`0${index + 1}`} // {stem.id.toUpperCase()}</span>
                </div>
              </div>

              {/* Channel Meters */}
              <div className="channel-meter nothing-meter">
                <div
                  className={`meter-bar nothing-meter-bar ${isPlaying && isAudible ? 'meter-active' : ''}`}
                  style={{
                    height: isPlaying && isAudible ? `${Math.max(stem.volume * 92, 10)}%` : '6%',
                  }}
                />
              </div>

              {/* Fader & Value */}
              <div className="channel-fader-section nothing-fader-section">
                <label htmlFor={`stem-fader-${stem.id}`} className="sr-only">
                  {stem.label} Volume
                </label>
                <input
                  id={`stem-fader-${stem.id}`}
                  type="range"
                  className="apollo-range vertical-fader nothing-vertical-fader"
                  min={0}
                  max={1}
                  step={0.01}
                  value={stem.volume}
                  onChange={(e) => onSetStemVolume(stem.id, parseFloat(e.target.value))}
                  aria-valuetext={`${Math.round(stem.volume * 100)} percent`}
                  style={
                    {
                      '--control-value': stem.volume * 100,
                      '--attr-min': 0,
                      '--attr-max': 100,
                      '--slider-progress': `${stem.volume * 100}%`,
                    } as React.CSSProperties
                  }
                />
                <span className="volume-percentage nothing-font-mono">{Math.round(stem.volume * 100)}%</span>
              </div>

              {/* Solo & Mute Buttons */}
              <div className="channel-actions nothing-actions">
                <button
                  type="button"
                  className={`matrix-button nothing-solo-btn ${stem.isSolo ? 'active' : ''}`}
                  onClick={() => onToggleSolo(stem.id)}
                  aria-pressed={stem.isSolo}
                  title="Solo stem"
                >
                  S
                </button>
                <button
                  type="button"
                  className={`matrix-button nothing-mute-btn ${stem.isMuted ? 'active' : ''}`}
                  onClick={() => onToggleMute(stem.id)}
                  aria-pressed={stem.isMuted}
                  title="Mute stem"
                >
                  M
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
