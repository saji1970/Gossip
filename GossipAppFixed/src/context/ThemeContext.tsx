import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccentName, ThemeMode, ACCENT_PRESETS, AccentPreset, applyTheme, buildColors } from '../constants/theme';

const THEME_STORAGE_KEY = '@gossip_theme';

interface ThemeContextType {
  mode: ThemeMode;
  accent: AccentName;
  colors: Record<string, string>;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentName) => void;
  accentOptions: AccentPreset[];
  rerenderKey: number;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [accent, setAccentState] = useState<AccentName>('indigo');
  const [rerenderKey, setRerenderKey] = useState(0);
  const [colors, setColors] = useState<Record<string, string>>(() => buildColors('dark', 'indigo'));

  // Load persisted theme on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          const m: ThemeMode = saved.mode === 'light' ? 'light' : 'dark';
          const a: AccentName = ACCENT_PRESETS[saved.accent as AccentName] ? (saved.accent as AccentName) : 'indigo';
          setModeState(m);
          setAccentState(a);
          applyTheme(m, a);
          setColors(buildColors(m, a));
          setRerenderKey(k => k + 1);
        }
      } catch {
        // use defaults
      }
    })();
  }, []);

  const persist = useCallback(async (m: ThemeMode, a: AccentName) => {
    applyTheme(m, a);
    setColors(buildColors(m, a));
    setRerenderKey(k => k + 1);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ mode: m, accent: a }));
    } catch {
      // ignore
    }
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    persist(m, accent);
  }, [accent, persist]);

  const setAccent = useCallback((a: AccentName) => {
    setAccentState(a);
    persist(mode, a);
  }, [mode, persist]);

  const accentOptions = Object.values(ACCENT_PRESETS);

  return (
    <ThemeContext.Provider value={{ mode, accent, colors, setMode, setAccent, accentOptions, rerenderKey }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
