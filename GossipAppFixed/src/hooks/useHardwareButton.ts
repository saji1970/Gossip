import { useEffect, useRef } from 'react';
import { DeviceEventEmitter, Platform } from 'react-native';

interface UseHardwareButtonOptions {
  onPress: () => void;
  onRelease: () => void;
  enabled?: boolean;
}

/**
 * Listen for volume-down hardware button press/release.
 * Android only — the native MainActivity emits hardwareKeyDown / hardwareKeyUp events.
 */
export function useHardwareButton({ onPress, onRelease, enabled = true }: UseHardwareButtonOptions) {
  const pressRef = useRef(onPress);
  const releaseRef = useRef(onRelease);

  pressRef.current = onPress;
  releaseRef.current = onRelease;

  useEffect(() => {
    if (Platform.OS !== 'android' || !enabled) return;

    const downSub = DeviceEventEmitter.addListener('hardwareKeyDown', () => {
      pressRef.current();
    });
    const upSub = DeviceEventEmitter.addListener('hardwareKeyUp', () => {
      releaseRef.current();
    });

    return () => {
      downSub.remove();
      upSub.remove();
    };
  }, [enabled]);
}
