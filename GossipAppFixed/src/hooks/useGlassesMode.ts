import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GLASSES_KEY = '@gossip_glasses_mode';

let cachedMode = false;

export function useGlassesMode() {
  const [glassesMode, setGlassesModeState] = useState(cachedMode);

  const setGlassesMode = useCallback(async (enabled: boolean) => {
    cachedMode = enabled;
    setGlassesModeState(enabled);
    try {
      await AsyncStorage.setItem(GLASSES_KEY, JSON.stringify(enabled));
    } catch {}
  }, []);

  const toggleGlassesMode = useCallback(() => {
    setGlassesMode(!glassesMode);
  }, [glassesMode, setGlassesMode]);

  return { glassesMode, setGlassesMode, toggleGlassesMode };
}
