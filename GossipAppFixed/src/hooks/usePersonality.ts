import { useState, useCallback, useRef, useEffect } from 'react';
import { usePersonalityContext } from '../context/PersonalityContext';
import { ConversationAnalysis, ReplySuggestion } from '../modules/personality/types';

const SUGGESTION_TIMEOUT_MS = 10000;

export function usePersonality() {
  const {
    analyzeAndUpdate,
    getSuggestionsForMessage,
    getProfile,
    allProfiles,
  } = usePersonalityContext();

  const [currentSuggestions, setCurrentSuggestions] = useState<ReplySuggestion[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSuggestions = useCallback(() => {
    setCurrentSuggestions([]);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const analyzeMessage = useCallback(
    (senderId: string, name: string, text: string) => {
      const analysis = analyzeAndUpdate(senderId, name, text);
      const suggestions = getSuggestionsForMessage(analysis);
      setCurrentSuggestions(suggestions);

      // Auto-clear after timeout
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setCurrentSuggestions([]);
        timerRef.current = null;
      }, SUGGESTION_TIMEOUT_MS);

      return analysis;
    },
    [analyzeAndUpdate, getSuggestionsForMessage],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    analyzeMessage,
    suggestions: currentSuggestions,
    clearSuggestions,
    getProfile,
    allProfiles,
  };
}
