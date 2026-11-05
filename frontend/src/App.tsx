import React, { useState } from 'react';
import { Header } from './components/Header';
import { AudioUploader } from './components/AudioUploader';
import { JamRoomMixer } from './components/JamRoomMixer';
import { NotationPlaceholder } from './components/NotationPlaceholder';
import { useWebAudioMixer } from './hooks/useWebAudioMixer';
import { SessionInfo } from './types';
import { Sliders, Sparkles, FileAudio } from 'lucide-react';

export const App: React.FC = () => {
  const [currentSession, setCurrentSession] = useState<SessionInfo | null>(null);

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
    <div className="apollo-app">
      <Header />

      <main className="main-workspace">
        {/* Left Column: Extraction & Jam Room Multi-Track Mixer */}
        <section className="workspace-column left-pane">
          <div className="section-title-bar">
            <div className="title-with-icon">
              <FileAudio size={20} className="pane-icon" />
              <h2>Audio Ingestion & Extraction</h2>
            </div>
            {currentSession && (
              <span className="session-tag">
                Session: {currentSession.session_id.slice(0, 8)}...
              </span>
            )}
          </div>

          <AudioUploader onSessionLoaded={handleSessionLoaded} />

          <div className="section-title-bar mt-6">
            <div className="title-with-icon">
              <Sliders size={20} className="pane-icon" />
              <h2>The "Jam Room" Multi-Track Mixer</h2>
            </div>
            {currentSession && (
              <span className="audio-ready-badge">
                <Sparkles size={14} />
                <span>4 Stems Isolated</span>
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
        </section>

        {/* Right Column: Dynamic Sheet Music & Tablature View */}
        <section className="workspace-column right-pane">
          <NotationPlaceholder
            sessionId={currentSession?.session_id}
            activeSessionFilename={currentSession?.original_filename}
            hasStems={Boolean(currentSession)}
            currentTime={currentTime}
            isPlaying={isPlaying}
          />
        </section>
      </main>
    </div>
  );
};

export default App;
