import { useState, useCallback, useRef, useEffect } from 'react';
import { audioService, RecordingResult } from '../services/AudioService';

interface UseAudioRecorderReturn {
  isRecording: boolean;
  recordingDurationMs: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<RecordingResult>;
  cancelRecording: () => Promise<void>;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Cancel any in-progress recording on unmount
      if (audioService.getIsRecording()) {
        audioService.cancelRecording();
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    setRecordingDurationMs(0);
    await audioService.startRecording((elapsedMs) => {
      if (mountedRef.current) {
        setRecordingDurationMs(elapsedMs);
      }
    });
    if (mountedRef.current) {
      setIsRecording(true);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<RecordingResult> => {
    const result = await audioService.stopRecording();
    if (mountedRef.current) {
      setIsRecording(false);
      setRecordingDurationMs(0);
    }
    return result;
  }, []);

  const cancelRecording = useCallback(async () => {
    await audioService.cancelRecording();
    if (mountedRef.current) {
      setIsRecording(false);
      setRecordingDurationMs(0);
    }
  }, []);

  return {
    isRecording,
    recordingDurationMs,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
