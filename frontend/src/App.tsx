import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AudioUploader } from './components/AudioUploader';
import { JamRoomMixer } from './components/JamRoomMixer';
import { NotationPlaceholder } from './components/NotationPlaceholder';
import { GuidedTutorial } from './components/GuidedTutorial';
import { useWebAudioMixer } from './hooks/useWebAudioMixer';
import { SessionInfo } from './types';
import { Sliders, Sparkles, FileAudio } from 'lucide-react';

export const App: React.FC = () => {
  const [currentSession, setCurrentSession] = useState<SessionInfo | null>(null);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);

  // Check if first-time user to show tutorial
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('apollo_tour_completed');
    if (!hasSeenTour) {
      // Trigger tutorial on first visit after brief render delay
      const timer = setTimeout(() => {
        setIsTutorialOpen(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCloseTutorial = () => {
    setIsTutorialOpen(false);
    localStorage.setItem('apollo_tour_completed', 'true');
  };

  const {
    stems,
    isPlaying,
    currentTime,
    duration,
    masterVolume,
    playbackRate,
    isLoadingStems,
    loadStems,
    togglePlay,
    seek,
    resetPlayback,
    setMasterVolume,
    setPlaybackRate,
    setStemVolume,
    toggleMute,
    toggleSolo,
  } = useWebAudioMixer();

  const handleSessionLoaded = (session: SessionInfo) => {
    setCurrentSession(session);
    loadStems(session.stem_urls);
  };

  return (
    <div className="apollo-app nothing-theme">
      {/* Nothing OS Global Dot Grid Texture is handled via CSS */}
      <Header onOpenTutorial={() => setIsTutorialOpen(true)} />

      <main className="main-workspace">
        {/* Left Column: Extraction & Jam Room Multi-Track Mixer */}
        <section className="workspace-column left-pane">
          {/* Uploader Section */}
          <div id="uploader-section" className="section-block">
            <div className="section-title-bar">
              <div className="title-with-icon">
                <FileAudio size={18} className="pane-icon" />
                <h2 className="nothing-section-heading">AUDIO INGESTION // DEMUCS V4</h2>
              </div>
              {currentSession && (
                <span className="session-tag nothing-tag">
                  SESSION // {currentSession.session_id.slice(0, 8)}
                </span>
              )}
            </div>

            <AudioUploader onSessionLoaded={handleSessionLoaded} />
          </div>

          {/* Mixer Section */}
          <div id="mixer-section" className="section-block mt-6">
            <div className="section-title-bar">
              <div className="title-with-icon">
                <Sliders size={18} className="pane-icon" />
                <h2 className="nothing-section-heading">THE "JAM ROOM" // MULTI-TRACK MIXER</h2>
              </div>
              {currentSession && (
                <span className="audio-ready-badge nothing-badge">
                  <Sparkles size={13} />
                  <span>4_STEMS // ISOLATED</span>
                </span>
              )}
            </div>

            <JamRoomMixer
              stems={stems}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              masterVolume={masterVolume}
              playbackRate={playbackRate}
              isLoadingStems={isLoadingStems}
              onTogglePlay={togglePlay}
              onSeek={seek}
              onReset={resetPlayback}
              onMasterVolumeChange={setMasterVolume}
              onPlaybackRateChange={setPlaybackRate}
              onSetStemVolume={setStemVolume}
              onToggleMute={toggleMute}
              onToggleSolo={toggleSolo}
            />
          </div>
        </section>

        {/* Right Column: Dynamic Sheet Music & Tablature View */}
        <section id="notation-section" className="workspace-column right-pane section-block">
          <NotationPlaceholder
            sessionId={currentSession?.session_id}
            activeSessionFilename={currentSession?.original_filename}
            hasStems={Boolean(currentSession)}
            currentTime={currentTime}
            isPlaying={isPlaying}
          />
        </section>
      </main>

      {/* Nothing OS Guided Tutorial Modal */}
      <GuidedTutorial
        isOpen={isTutorialOpen}
        onClose={handleCloseTutorial}
      />
    </div>
  );
};

export default App;
