import React, { useEffect, useRef, useState } from 'react';
import * as alphaTab from '@coderline/alphatab';
import { NotationData } from '../types';
import { convertNotationToAlphaTex } from '../utils/alphaTexConverter';
import { ZoomIn, ZoomOut, Maximize2, AlertCircle } from 'lucide-react';

interface AlphaTabRendererProps {
  notationData: NotationData;
  notationStyle: 'tab' | 'sheet' | 'both';
  currentTime: number;
  isPlaying: boolean;
}

export const AlphaTabRenderer: React.FC<AlphaTabRendererProps> = ({
  notationData,
  notationStyle,
  currentTime,
  isPlaying,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<alphaTab.AlphaTabApi | null>(null);
  const [scale, setScale] = useState<number>(0.95);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isRendered, setIsRendered] = useState<boolean>(false);

  // Initialize AlphaTab API
  useEffect(() => {
    if (!containerRef.current) return;

    try {
      const api = new alphaTab.AlphaTabApi(containerRef.current, {
        core: {
          engine: 'svg',
          logLevel: alphaTab.LogLevel.Warning,
        },
        display: {
          staveProfile:
            notationStyle === 'tab'
              ? alphaTab.StaveProfile.Tab
              : notationStyle === 'sheet'
              ? alphaTab.StaveProfile.Score
              : alphaTab.StaveProfile.ScoreTab,
          scale: scale,
          layoutMode: alphaTab.LayoutMode.Page,
        },
        notation: {
          elements: new Map([
            [alphaTab.NotationElement.ScoreTitle, false],
            [alphaTab.NotationElement.ScoreWordsAndMusic, false],
            [alphaTab.NotationElement.TrackNames, false],
          ]),
        },
        player: {
          enablePlayer: false, // Apollo uses its own sample-accurate Web Audio mixer
        },
      });

      api.renderFinished.on(() => {
        setIsRendered(true);
      });

      apiRef.current = api;
    } catch (err: any) {
      console.error('Failed to initialize AlphaTab:', err);
      setRenderError('Failed to initialize notation rendering engine.');
    }

    return () => {
      if (apiRef.current) {
        apiRef.current.destroy();
        apiRef.current = null;
      }
    };
  }, []);

  // Update Score data when notation changes
  useEffect(() => {
    const api = apiRef.current;
    if (!api || !notationData) return;

    setRenderError(null);
    try {
      const tex = convertNotationToAlphaTex(notationData);
      api.tex(tex);
    } catch (err: any) {
      console.error('AlphaTab render error:', err);
      setRenderError('Could not parse musical score syntax.');
    }
  }, [notationData]);

  // Update stave profile when style toggle changes
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;

    const newProfile =
      notationStyle === 'tab'
        ? alphaTab.StaveProfile.Tab
        : notationStyle === 'sheet'
        ? alphaTab.StaveProfile.Score
        : alphaTab.StaveProfile.ScoreTab;

    if (api.settings.display.staveProfile !== newProfile) {
      api.settings.display.staveProfile = newProfile;
      api.updateSettings();
      api.render();
    }
  }, [notationStyle]);

  // Update zoom scale
  const handleZoom = (delta: number) => {
    const newScale = Math.min(Math.max(scale + delta, 0.6), 1.5);
    setScale(newScale);
    if (apiRef.current) {
      apiRef.current.settings.display.scale = newScale;
      apiRef.current.updateSettings();
      apiRef.current.render();
    }
  };

  // Playhead position synchronization during audio playback
  useEffect(() => {
    if (!isRendered || !containerRef.current) return;

    const tempo = notationData.metadata.tempo || 120;
    const beatsPerSec = tempo / 60.0;
    const currentBeat = currentTime * beatsPerSec;
    const currentBar = Math.floor(currentBeat / 4.0) + 1;

    // Highlight current bar element in SVG
    const barElements = containerRef.current.querySelectorAll('.at-bar');
    barElements.forEach((el, index) => {
      const barNum = index + 1;
      if (isPlaying && barNum === currentBar) {
        el.classList.add('at-bar-active');
        // Auto scroll to active bar smoothly
        if (isPlaying && currentBar % 4 === 1) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      } else {
        el.classList.remove('at-bar-active');
      }
    });
  }, [currentTime, isPlaying, isRendered, notationData]);

  return (
    <div className="alphatab-wrapper">
      {/* Zoom and Display Bar */}
      <div className="alphatab-toolbar">
        <div className="zoom-controls">
          <button
            type="button"
            className="zoom-btn"
            onClick={() => handleZoom(-0.1)}
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <span className="zoom-level">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            className="zoom-btn"
            onClick={() => handleZoom(0.1)}
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            className="zoom-btn"
            onClick={() => {
              setScale(0.95);
              if (apiRef.current) {
                apiRef.current.settings.display.scale = 0.95;
                apiRef.current.updateSettings();
                apiRef.current.render();
              }
            }}
            title="Reset Zoom"
            aria-label="Reset Zoom"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {renderError && (
        <div className="error-alert">
          <AlertCircle size={16} />
          <span>{renderError}</span>
        </div>
      )}

      {/* AlphaTab SVG Mount Target */}
      <div className="alphatab-container" ref={containerRef} />
    </div>
  );
};
