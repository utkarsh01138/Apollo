import React, { useState, useEffect } from 'react';
import {
  Compass,
  ChevronRight,
  ChevronLeft,
  X,
  FileAudio,
  Sliders,
  BookOpen,
  Sparkles,
  Download,
  CheckCircle2,
} from 'lucide-react';

export interface TutorialStep {
  id: string;
  badge: string;
  title: string;
  description: string;
  targetId?: string;
  icon: React.ReactNode;
  tips?: string[];
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'intro',
    badge: 'SYSTEM // INIT [01/06]',
    title: 'WELCOME TO PROJECT APOLLO',
    description:
      'Apollo is an offline-first workstation engineered for mathematical sound decomposition and adaptive notation. It isolates instrument stems locally via deep learning and translates them into interactive sheet music & tablature.',
    icon: <Compass size={22} className="text-nothing-red" />,
    tips: [
      'Zero cloud dependency — all ML inference executes on your local hardware',
      'Dual-pane console: Audio stem mixer on the left, vector notation on the right',
    ],
  },
  {
    id: 'ingestion',
    badge: 'EXTRACT // DEMUCS_V4 [02/06]',
    title: 'AUDIO INGESTION & STEM SEPARATION',
    description:
      'Drop any multi-track song (MP3, WAV, FLAC, OGG, M4A). Meta Demucs v4 runs in an asynchronous background pipeline to separate the audio into 4 pristine isolated stems: Vocals, Bass, Drums, and Other.',
    targetId: 'uploader-section',
    icon: <FileAudio size={22} className="text-nothing-red" />,
    tips: [
      'Maximum quality separation minimizes bleed for cleaner MIDI transcription',
      'Non-blocking background queue with live percentage telemetry',
    ],
  },
  {
    id: 'mixer',
    badge: 'CONSOLE // JAM_ROOM [03/06]',
    title: 'THE "JAM ROOM" MULTI-TRACK MIXER',
    description:
      'Practice alongside your favorite tracks by muting or isolating specific instruments. Toggle Solo [S] to isolate your instrument or Mute [M] to create a custom backing track.',
    targetId: 'mixer-section',
    icon: <Sliders size={22} className="text-nothing-red" />,
    tips: [
      'Pitch-neutral tempo shifting: Slow down to 0.5x or speed up to 1.5x without pitch distortion',
      'Sample-accurate Web Audio clock keeps all 4 stems perfectly phase-aligned',
    ],
  },
  {
    id: 'notation',
    badge: 'ENGINE // BASIC_PITCH [04/06]',
    title: 'AUDIO-TO-MIDI & VECTOR SCORE',
    description:
      'Spotify Basic-Pitch transcribes isolated stems (Bass, Vocals, or Other) into symbolic musical notes, rendered as dynamic SVG vector sheet music and tablature via AlphaTab.',
    targetId: 'notation-section',
    icon: <BookOpen size={22} className="text-nothing-red" />,
    tips: [
      'Switch between Bass, Vocals, or Other stems anytime with top pills',
      'Toggle View mode: Score + TAB, Tab Only, or Standard Sheet Music',
    ],
  },
  {
    id: 'difficulty',
    badge: 'TIER // PROGRESSIVE [05/06]',
    title: 'PROGRESSIVE DIFFICULTY SCALING',
    description:
      'Apollo applies algorithmic note filtering powered by Music21. Select your tier to match your current skill level and strip intimidating complexities.',
    targetId: 'difficulty-controls',
    icon: <Sparkles size={22} className="text-nothing-red" />,
    tips: [
      'Beginner: 8th/quarter note root quantization; fast passing tones simplified',
      'Amateur: 16th-note grooves preserved; micro-ornaments filtered',
      'Pro: Verbatim 1:1 transcription showing complete rhythmic nuance',
    ],
  },
  {
    id: 'practice',
    badge: 'SYNC // EXPORTS [06/06]',
    title: 'SYNCHRONIZED PRACTICE & EXPORTS',
    description:
      'Hit Play in the Jam Room: the notation playhead advances across measures in sync with the audio. When you are ready, download the raw MIDI and MusicXML files with one click.',
    targetId: 'export-section',
    icon: <Download size={22} className="text-nothing-red" />,
    tips: [
      'Import generated MIDI directly into your DAW (Ableton, Logic, FL Studio)',
      'Load MusicXML scores into MuseScore, Guitar Pro, or Sibelius',
    ],
  },
];

interface GuidedTutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuidedTutorial: React.FC<GuidedTutorialProps> = ({ isOpen, onClose }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  const currentStep = TUTORIAL_STEPS[currentStepIndex];

  // Scroll to target element and highlight it
  useEffect(() => {
    if (!isOpen) {
      // Remove any leftover spotlights
      document.querySelectorAll('.nothing-spotlight-active').forEach((el) => {
        el.classList.remove('nothing-spotlight-active');
      });
      return;
    }

    // Clear previous highlights
    document.querySelectorAll('.nothing-spotlight-active').forEach((el) => {
      el.classList.remove('nothing-spotlight-active');
    });

    if (currentStep.targetId) {
      const el = document.getElementById(currentStep.targetId);
      if (el) {
        el.classList.add('nothing-spotlight-active');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    return () => {
      document.querySelectorAll('.nothing-spotlight-active').forEach((el) => {
        el.classList.remove('nothing-spotlight-active');
      });
    };
  }, [isOpen, currentStepIndex, currentStep]);

  // Keyboard navigation: Left/Right arrows & Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
          setCurrentStepIndex((prev) => prev + 1);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStepIndex > 0) {
          setCurrentStepIndex((prev) => prev - 1);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, onClose]);

  if (!isOpen) return null;

  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="nothing-tutorial-overlay" role="dialog" aria-modal="true">
      {/* Background Dim */}
      <div className="nothing-tutorial-backdrop" onClick={onClose} />

      {/* Nothing OS Widget Card */}
      <div className="nothing-tutorial-card">
        {/* Top Hardware-Style Bar */}
        <div className="nothing-tutorial-header">
          <div className="tutorial-status-pill">
            <span className="nothing-led-dot red-pulse" />
            <span className="tutorial-badge-text">{currentStep.badge}</span>
          </div>

          <button
            type="button"
            className="nothing-icon-btn close-btn"
            onClick={onClose}
            aria-label="Close Guide"
            title="Close Guide (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="nothing-tutorial-body">
          <div className="tutorial-title-row">
            <div className="tutorial-glyph-box">
              {currentStep.icon}
            </div>
            <h3 className="tutorial-step-title">{currentStep.title}</h3>
          </div>

          <p className="tutorial-step-desc">{currentStep.description}</p>

          {currentStep.tips && currentStep.tips.length > 0 && (
            <div className="tutorial-tips-box">
              <span className="tips-header-tag">// HARDWARE_SPECS & INSIGHTS</span>
              <ul className="tutorial-tips-list">
                {currentStep.tips.map((tip, idx) => (
                  <li key={idx}>
                    <span className="tip-bullet">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Bottom Navigation & Matrix Pagination */}
        <div className="nothing-tutorial-footer">
          {/* Dot Matrix Step Indicator */}
          <div className="nothing-dot-stepper" aria-label="Step navigation">
            {TUTORIAL_STEPS.map((step, idx) => (
              <button
                key={step.id}
                type="button"
                className={`nothing-step-dot ${
                  idx === currentStepIndex
                    ? 'active'
                    : idx < currentStepIndex
                    ? 'completed'
                    : ''
                }`}
                onClick={() => setCurrentStepIndex(idx)}
                aria-label={`Jump to Step ${idx + 1}`}
                title={`Step ${idx + 1}: ${step.title}`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="tutorial-action-buttons">
            {!isFirst && (
              <button
                type="button"
                className="nothing-pill-btn secondary"
                onClick={handlePrev}
              >
                <ChevronLeft size={16} />
                <span>PREV</span>
              </button>
            )}

            <button
              type="button"
              className="nothing-pill-btn primary"
              onClick={handleNext}
            >
              <span>{isLast ? 'FINISH' : 'NEXT'}</span>
              {isLast ? <CheckCircle2 size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

