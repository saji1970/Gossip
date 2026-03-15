import { useState, useCallback, useRef, useEffect } from 'react';
import { audioService } from '../services/AudioService';

interface UseAudioPlaybackReturn {
  isPlaying: boolean;
  currentUri: string | null;
  progress: number; // 0-1
  currentMs: number;
  durationMs: number;
  play: (uri: string, duration?: number) => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
}

export function useAudioPlayback(): UseAudioPlaybackReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentUri, setCurrentUri] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      audioService.stopPlayback();
    };
  }, []);

  const play = useCallback(async (uri: string, duration?: number) => {
    // If same URI is playing, toggle pause/resume
    if (currentUri === uri && isPlaying) {
      await audioService.pausePlayback();
      if (mountedRef.current) setIsPlaying(false);
      return;
    }

    if (duration) setDurationMs(duration);
    setCurrentUri(uri);
    setIsPlaying(true);
    setProgress(0);
    setCurrentMs(0);

    await audioService.play(
      uri,
      (curMs, durMs) => {
        if (mountedRef.current) {
          setCurrentMs(curMs);
          setDurationMs(durMs);
          setProgress(durMs > 0 ? curMs / durMs : 0);
        }
      },
      () => {
        if (mountedRef.current) {
          setIsPlaying(false);
          setProgress(0);
          setCurrentMs(0);
          setCurrentUri(null);
        }
      },
    );
  }, [currentUri, isPlaying]);

  const pause = useCallback(async () => {
    await audioService.pausePlayback();
    if (mountedRef.current) setIsPlaying(false);
  }, []);

  const stop = useCallback(async () => {
    await audioService.stopPlayback();
    if (mountedRef.current) {
      setIsPlaying(false);
      setProgress(0);
      setCurrentMs(0);
      setCurrentUri(null);
    }
  }, []);

  return {
    isPlaying,
    currentUri,
    progress,
    currentMs,
    durationMs,
    play,
    pause,
    stop,
  };
}
