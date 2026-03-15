import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  Animated,
  StyleSheet,
} from 'react-native';
import { Colors, VoiceButtonSizes } from '../../constants/theme';
import { VoiceState } from '../../modules/voice/VoiceService';

interface VoiceButtonProps {
  voiceState: VoiceState;
  onPress: () => void;
  size?: 'large' | 'medium' | 'small';
  disabled?: boolean;
}

const VoiceButton: React.FC<VoiceButtonProps> = ({
  voiceState,
  onPress,
  size = 'large',
  disabled = false,
}) => {
  const dims = VoiceButtonSizes[size];

  // Pulse ring animations (3 rings)
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse1Opacity = useRef(new Animated.Value(0.6)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const pulse2Opacity = useRef(new Animated.Value(0.6)).current;
  const pulse3 = useRef(new Animated.Value(1)).current;
  const pulse3Opacity = useRef(new Animated.Value(0.6)).current;

  // Processing rotation
  const processingRotation = useRef(new Animated.Value(0)).current;

  // Error shake
  const shakeX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Reset all
    pulse1.setValue(1);
    pulse1Opacity.setValue(0.6);
    pulse2.setValue(1);
    pulse2Opacity.setValue(0.6);
    pulse3.setValue(1);
    pulse3Opacity.setValue(0.6);
    processingRotation.setValue(0);
    shakeX.setValue(0);

    if (voiceState === 'listening') {
      // Staggered pulse rings
      const createPulse = (scaleAnim: Animated.Value, opacityAnim: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.timing(scaleAnim, { toValue: 1.8, duration: 1200, useNativeDriver: true }),
              Animated.timing(opacityAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
            ]),
            Animated.parallel([
              Animated.timing(scaleAnim, { toValue: 1, duration: 0, useNativeDriver: true }),
              Animated.timing(opacityAnim, { toValue: 0.6, duration: 0, useNativeDriver: true }),
            ]),
          ])
        );

      createPulse(pulse1, pulse1Opacity, 0).start();
      createPulse(pulse2, pulse2Opacity, 400).start();
      createPulse(pulse3, pulse3Opacity, 800).start();
    } else if (voiceState === 'processing') {
      Animated.loop(
        Animated.timing(processingRotation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else if (voiceState === 'error') {
      Animated.sequence([
        Animated.timing(shakeX, { toValue: 10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }
  }, [voiceState]);

  const bgColor =
    voiceState === 'listening' ? Colors.voiceListening :
    voiceState === 'processing' ? Colors.voiceProcessing :
    voiceState === 'error' ? Colors.voiceError :
    Colors.voiceIdle;

  const icon =
    voiceState === 'listening' ? '🎙️' :
    voiceState === 'processing' ? '⏳' :
    voiceState === 'error' ? '⚠️' :
    '🎤';

  const rotateInterpolation = processingRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.wrapper, { width: dims.size * 2, height: dims.size * 2 }]}>
      {/* Pulse rings — only visible when listening */}
      {voiceState === 'listening' && (
        <>
          <Animated.View
            style={[
              styles.pulseRing,
              {
                width: dims.size,
                height: dims.size,
                borderRadius: dims.size / 2,
                borderColor: Colors.voiceListening,
                transform: [{ scale: pulse1 }],
                opacity: pulse1Opacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.pulseRing,
              {
                width: dims.size,
                height: dims.size,
                borderRadius: dims.size / 2,
                borderColor: Colors.voiceListening,
                transform: [{ scale: pulse2 }],
                opacity: pulse2Opacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.pulseRing,
              {
                width: dims.size,
                height: dims.size,
                borderRadius: dims.size / 2,
                borderColor: Colors.voiceListening,
                transform: [{ scale: pulse3 }],
                opacity: pulse3Opacity,
              },
            ]}
          />
        </>
      )}

      <Animated.View
        style={{
          transform: [
            { translateX: voiceState === 'error' ? shakeX : 0 },
            ...(voiceState === 'processing' ? [{ rotate: rotateInterpolation }] : []),
          ],
        }}
      >
        <TouchableOpacity
          style={[
            styles.button,
            {
              width: dims.size,
              height: dims.size,
              borderRadius: dims.size / 2,
              backgroundColor: bgColor,
            },
            disabled && styles.disabled,
          ]}
          onPress={onPress}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: dims.iconSize }}>{icon}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default VoiceButton;
