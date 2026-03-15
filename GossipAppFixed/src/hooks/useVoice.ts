import { useState, useEffect, useCallback, useRef } from 'react';
import { voiceService, VoiceState, VoiceResult } from '../modules/voice/VoiceService';

export function useVoice() {
  const [voiceState, setVoiceState] = useState<VoiceState>(voiceService.getState());
  const [lastResult, setLastResult] = useState<VoiceResult | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const unsubState = voiceService.onStateChange((state) => {
      if (mountedRef.current) setVoiceState(state);
    });

    const unsubResult = voiceService.onResult((result) => {
      if (mountedRef.current) setLastResult(result);
    });

    return () => {
      mountedRef.current = false;
      unsubState();
      unsubResult();
    };
  }, []);

  const startListening = useCallback(() => {
    voiceService.startListening();
  }, []);

  const stopListening = useCallback(() => {
    voiceService.stopListening();
  }, []);

  const cancelListening = useCallback(() => {
    voiceService.cancelListening();
  }, []);

  const simulateInput = useCallback((text: string) => {
    voiceService.simulateInput(text);
  }, []);

  return {
    voiceState,
    isListening: voiceState === 'listening',
    isProcessing: voiceState === 'processing',
    startListening,
    stopListening,
    cancelListening,
    simulateInput,
    lastResult,
  };
}
