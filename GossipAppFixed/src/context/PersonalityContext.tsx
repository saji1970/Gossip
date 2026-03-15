import React, { createContext, useContext, useState, useCallback } from 'react';
import { personalityEngine } from '../modules/personality/PersonalityEngine';
import {
  FriendProfile,
  ConversationAnalysis,
  ReplySuggestion,
} from '../modules/personality/types';

interface PersonalityContextValue {
  profiles: Map<string, FriendProfile>;
  analyzeAndUpdate: (senderId: string, name: string, text: string) => ConversationAnalysis;
  getSuggestionsForMessage: (analysis: ConversationAnalysis) => ReplySuggestion[];
  getProfile: (id: string) => FriendProfile | undefined;
  allProfiles: FriendProfile[];
}

const PersonalityContext = createContext<PersonalityContextValue | null>(null);

export const PersonalityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profiles, setProfiles] = useState<Map<string, FriendProfile>>(new Map());

  const analyzeAndUpdate = useCallback((senderId: string, name: string, text: string) => {
    const analysis = personalityEngine.analyzeMessage(senderId, name, text);
    // Refresh profiles state so consumers re-render
    const updated = new Map<string, FriendProfile>();
    for (const p of personalityEngine.getAllProfiles()) {
      updated.set(p.id, p);
    }
    setProfiles(updated);
    return analysis;
  }, []);

  const getSuggestionsForMessage = useCallback((analysis: ConversationAnalysis) => {
    return personalityEngine.getSuggestions(analysis);
  }, []);

  const getProfile = useCallback((id: string) => {
    return personalityEngine.getProfile(id);
  }, []);

  const allProfiles = React.useMemo(() => Array.from(profiles.values()), [profiles]);

  return (
    <PersonalityContext.Provider
      value={{
        profiles,
        analyzeAndUpdate,
        getSuggestionsForMessage,
        getProfile,
        allProfiles,
      }}
    >
      {children}
    </PersonalityContext.Provider>
  );
};

export function usePersonalityContext(): PersonalityContextValue {
  const ctx = useContext(PersonalityContext);
  if (!ctx) {
    throw new Error('usePersonalityContext must be used within PersonalityProvider');
  }
  return ctx;
}
