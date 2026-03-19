import { useEffect, useRef } from 'react';
import { DeviceEventEmitter, Platform, Vibration } from 'react-native';

const VOLUME_DOWN_KEYCODE = 25;
const VOLUME_UP_KEYCODE = 24;

interface UseVolumeButtonsOptions {
  onVolumeDownLongPress?: () => void;
  onVolumeUpLongPress?: () => void;
  onVolumeDownShortPress?: () => void;
  onVolumeUpShortPress?: () => void;
  enabled?: boolean;
  longPressThreshold?: number; // ms, default 300
  hapticFeedback?: boolean; // default true
}

/**
 * Listen for hardware volume button presses on Android.
 * Differentiates between short press and long press.
 *
 * Volume Down long press → voice command toggle
 * Volume Up long press   → voice recording toggle
 *
 * Handles Android key-repeat filtering and provides haptic feedback.
 */
export function useVolumeButtons({
  onVolumeDownLongPress,
  onVolumeUpLongPress,
  onVolumeDownShortPress,
  onVolumeUpShortPress,
  enabled = true,
  longPressThreshold = 300,
  hapticFeedback = true,
}: UseVolumeButtonsOptions) {
  const cbRef = useRef({
    onVolumeDownLongPress,
    onVolumeUpLongPress,
    onVolumeDownShortPress,
    onVolumeUpShortPress,
  });
  cbRef.current = {
    onVolumeDownLongPress,
    onVolumeUpLongPress,
    onVolumeDownShortPress,
    onVolumeUpShortPress,
  };

  const longPressTimerRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const longPressFiredRef = useRef<Map<number, boolean>>(new Map());
  const keyHeldRef = useRef<Set<number>>(new Set());
  const hapticRef = useRef(hapticFeedback);
  hapticRef.current = hapticFeedback;

  useEffect(() => {
    if (Platform.OS !== 'android' || !enabled) return;

    const handleKeyDown = (event: { keyCode: number }) => {
      const { keyCode } = event;
      if (keyCode !== VOLUME_DOWN_KEYCODE && keyCode !== VOLUME_UP_KEYCODE) return;

      // Ignore if key is already held down (safety net for any repeat events
      // that slip through the native filter)
      if (keyHeldRef.current.has(keyCode)) return;
      keyHeldRef.current.add(keyCode);

      longPressFiredRef.current.set(keyCode, false);

      // Start long-press timer
      const timer = setTimeout(() => {
        longPressFiredRef.current.set(keyCode, true);

        // Haptic pulse on long-press activation
        if (hapticRef.current) {
          Vibration.vibrate(30);
        }

        if (keyCode === VOLUME_DOWN_KEYCODE) {
          cbRef.current.onVolumeDownLongPress?.();
        } else {
          cbRef.current.onVolumeUpLongPress?.();
        }
      }, longPressThreshold);

      longPressTimerRef.current.set(keyCode, timer);
    };

    const handleKeyUp = (event: { keyCode: number }) => {
      const { keyCode } = event;
      if (keyCode !== VOLUME_DOWN_KEYCODE && keyCode !== VOLUME_UP_KEYCODE) return;

      // Release held state
      keyHeldRef.current.delete(keyCode);

      // Clear long-press timer
      const timer = longPressTimerRef.current.get(keyCode);
      if (timer) {
        clearTimeout(timer);
        longPressTimerRef.current.delete(keyCode);
      }

      // If long press already fired, nothing on release
      if (longPressFiredRef.current.get(keyCode)) return;

      // Short press
      if (keyCode === VOLUME_DOWN_KEYCODE) {
        cbRef.current.onVolumeDownShortPress?.();
      } else {
        cbRef.current.onVolumeUpShortPress?.();
      }
    };

    const downSub = DeviceEventEmitter.addListener('hardwareKeyDown', handleKeyDown);
    const upSub = DeviceEventEmitter.addListener('hardwareKeyUp', handleKeyUp);

    return () => {
      downSub.remove();
      upSub.remove();
      longPressTimerRef.current.forEach(t => clearTimeout(t));
      longPressTimerRef.current.clear();
      keyHeldRef.current.clear();
    };
  }, [enabled, longPressThreshold]);
}
