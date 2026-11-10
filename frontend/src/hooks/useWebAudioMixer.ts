import { useState, useRef, useEffect, useCallback } from 'react';
import { StemTrack, StemType } from '../types';

const DEFAULT_STEMS: StemTrack[] = [
  { id: 'vocals', label: 'Vocals', color: '#ec4899', volume: 0.85, isMuted: false, isSolo: false, isLoaded: false, url: '' },
  { id: 'bass', label: 'Bassline', color: '#3b82f6', volume: 0.85, isMuted: false, isSolo: false, isLoaded: false, url: '' },
  { id: 'drums', label: 'Drums', color: '#f59e0b', volume: 0.85, isMuted: false, isSolo: false, isLoaded: false, url: '' },
  { id: 'other', label: 'Harmonic / Other', color: '#10b981', volume: 0.85, isMuted: false, isSolo: false, isLoaded: false, url: '' },
];

export function useWebAudioMixer() {
  const [stems, setStems] = useState<StemTrack[]>(DEFAULT_STEMS);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [masterVolume, setMasterVolume] = useState<number>(0.9);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isLoadingStems, setIsLoadingStems] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const buffersRef = useRef<Record<StemType, AudioBuffer | null>>({
    vocals: null,
    bass: null,
    drums: null,
    other: null,
  });
  const gainNodesRef = useRef<Record<StemType, GainNode | null>>({
    vocals: null,
    bass: null,
    drums: null,
    other: null,
  });
  const sourceNodesRef = useRef<Record<StemType, AudioBufferSourceNode | null>>({
    vocals: null,
    bass: null,
    drums: null,
    other: null,
  });

  const startTimeRef = useRef<number>(0);
  const offsetRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Initialize Web Audio Context
  const getOrCreateAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(masterVolume, ctx.currentTime);
      masterGain.connect(ctx.destination);

      audioCtxRef.current = ctx;
      masterGainRef.current = masterGain;

      // Initialize gain nodes for stems
      (['vocals', 'bass', 'drums', 'other'] as StemType[]).forEach((stemId) => {
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.85, ctx.currentTime);
        gainNode.connect(masterGain);
        gainNodesRef.current[stemId] = gainNode;
      });
    }

    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, [masterVolume]);

  // Update stem gain levels according to volume, mute, and solo matrix
  const updateStemGains = useCallback((currentStems: StemTrack[]) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const hasAnySolo = currentStems.some((s) => s.isSolo);

    currentStems.forEach((stem) => {
      const gainNode = gainNodesRef.current[stem.id];
      if (!gainNode) return;

      let targetGain = 0;
      if (hasAnySolo) {
        targetGain = stem.isSolo && !stem.isMuted ? stem.volume : 0;
      } else {
        targetGain = stem.isMuted ? 0 : stem.volume;
      }

      // Smooth gain ramp to prevent clicking
      gainNode.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.015);
    });
  }, []);

  // Load stem audio buffers
  const loadStems = useCallback(async (stemUrls: Record<string, string>) => {
    const ctx = getOrCreateAudioContext();
    setIsLoadingStems(true);
    stopPlayback();
    offsetRef.current = 0;
    setCurrentTime(0);

    try {
      const updatedStems = [...DEFAULT_STEMS];
      let maxDuration = 0;

      await Promise.all(
        updatedStems.map(async (stem) => {
          const url = stemUrls[stem.id];
          if (!url) return;

          stem.url = url;
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

          buffersRef.current[stem.id] = audioBuffer;
          stem.isLoaded = true;

          if (audioBuffer.duration > maxDuration) {
            maxDuration = audioBuffer.duration;
          }
        })
      );

      setDuration(maxDuration);
      setStems(updatedStems);
      updateStemGains(updatedStems);
    } catch (err) {
      console.error('Failed to decode stem audio data:', err);
    } finally {
      setIsLoadingStems(false);
    }
  }, [getOrCreateAudioContext, updateStemGains]);

  // Stop active sources
  const stopPlayback = useCallback(() => {
    (['vocals', 'bass', 'drums', 'other'] as StemType[]).forEach((stemId) => {
      const src = sourceNodesRef.current[stemId];
      if (src) {
        try {
          src.stop();
          src.disconnect();
        } catch (_) {}
        sourceNodesRef.current[stemId] = null;
      }
    });

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  // Synchronized playback loop
  const startPlayback = useCallback((startOffset: number = offsetRef.current) => {
    const ctx = getOrCreateAudioContext();
    stopPlayback();

    const boundedOffset = Math.max(0, Math.min(startOffset, duration));
    offsetRef.current = boundedOffset;
    startTimeRef.current = ctx.currentTime;

    let hasAnySource = false;

    (['vocals', 'bass', 'drums', 'other'] as StemType[]).forEach((stemId) => {
      const buffer = buffersRef.current[stemId];
      const gainNode = gainNodesRef.current[stemId];

      if (buffer && gainNode) {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.setValueAtTime(playbackRate, ctx.currentTime);
        source.connect(gainNode);

        source.start(ctx.currentTime, boundedOffset);
        sourceNodesRef.current[stemId] = source;
        hasAnySource = true;
      }
    });

    if (hasAnySource) {
      setIsPlaying(true);

      const updateProgress = () => {
        if (!audioCtxRef.current) return;
        const elapsed = (audioCtxRef.current.currentTime - startTimeRef.current) * playbackRate;
        const current = offsetRef.current + elapsed;

        if (current >= duration) {
          stopPlayback();
          offsetRef.current = 0;
          setCurrentTime(0);
        } else {
          setCurrentTime(current);
          animFrameRef.current = requestAnimationFrame(updateProgress);
        }
      };

      animFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, [getOrCreateAudioContext, stopPlayback, duration, playbackRate]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      const ctx = audioCtxRef.current;
      if (ctx) {
        const elapsed = (ctx.currentTime - startTimeRef.current) * playbackRate;
        offsetRef.current = Math.min(offsetRef.current + elapsed, duration);
      }
      stopPlayback();
    } else {
      if (currentTime >= duration) {
        startPlayback(0);
      } else {
        startPlayback(offsetRef.current);
      }
    }
  }, [isPlaying, playbackRate, duration, currentTime, startPlayback, stopPlayback]);

  const seek = useCallback((targetTime: number) => {
    const boundedTime = Math.max(0, Math.min(targetTime, duration));
    offsetRef.current = boundedTime;
    setCurrentTime(boundedTime);

    if (isPlaying) {
      startPlayback(boundedTime);
    }
  }, [duration, isPlaying, startPlayback]);

  const resetPlayback = useCallback(() => {
    stopPlayback();
    offsetRef.current = 0;
    setCurrentTime(0);
  }, [stopPlayback]);

  // Adjust master volume
  const handleMasterVolumeChange = useCallback((newVol: number) => {
    setMasterVolume(newVol);
    const ctx = audioCtxRef.current;
    if (masterGainRef.current && ctx) {
      masterGainRef.current.gain.setTargetAtTime(newVol, ctx.currentTime, 0.015);
    }
  }, []);

  // Adjust playback speed
  const handlePlaybackRateChange = useCallback((newRate: number) => {
    setPlaybackRate(newRate);
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    if (isPlaying) {
      // Re-anchor start time for progress tracking
      const elapsed = (ctx.currentTime - startTimeRef.current) * playbackRate;
      offsetRef.current = offsetRef.current + elapsed;
      startTimeRef.current = ctx.currentTime;
    }

    (['vocals', 'bass', 'drums', 'other'] as StemType[]).forEach((stemId) => {
      const src = sourceNodesRef.current[stemId];
      if (src) {
        src.playbackRate.setValueAtTime(newRate, ctx.currentTime);
      }
    });
  }, [isPlaying, playbackRate]);

  // Stem controls (volume, mute, solo)
  const setStemVolume = useCallback((stemId: StemType, newVol: number) => {
    setStems((prev) => {
      const next = prev.map((s) => (s.id === stemId ? { ...s, volume: newVol } : s));
      updateStemGains(next);
      return next;
    });
  }, [updateStemGains]);

  const toggleMute = useCallback((stemId: StemType) => {
    setStems((prev) => {
      const next = prev.map((s) => (s.id === stemId ? { ...s, isMuted: !s.isMuted } : s));
      updateStemGains(next);
      return next;
    });
  }, [updateStemGains]);

  const toggleSolo = useCallback((stemId: StemType) => {
    setStems((prev) => {
      const next = prev.map((s) => (s.id === stemId ? { ...s, isSolo: !s.isSolo } : s));
      updateStemGains(next);
      return next;
    });
  }, [updateStemGains]);

  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [stopPlayback]);

  return {
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
    setMasterVolume: handleMasterVolumeChange,
    setPlaybackRate: handlePlaybackRateChange,
    setStemVolume,
    toggleMute,
    toggleSolo,
  };
}
