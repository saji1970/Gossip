import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../../constants/theme';

interface SpeakerAuraProps {
  name: string;
  isActive: boolean;
  avatarColor?: string;
  size?: number;
}

const SpeakerAura: React.FC<SpeakerAuraProps> = ({
  name,
  isActive,
  avatarColor = Colors.primary,
  size = 48,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const waveAnim1 = useRef(new Animated.Value(0)).current;
  const waveAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();

      // Glow opacity
      Animated.timing(glowAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();

      // Wave rings
      Animated.loop(
        Animated.stagger(400, [
          Animated.sequence([
            Animated.timing(waveAnim1, { toValue: 1, duration: 1200, useNativeDriver: true }),
            Animated.timing(waveAnim1, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(waveAnim2, { toValue: 1, duration: 1200, useNativeDriver: true }),
            Animated.timing(waveAnim2, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      Animated.timing(glowAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      waveAnim1.stopAnimation();
      waveAnim2.stopAnimation();
      waveAnim1.setValue(0);
      waveAnim2.setValue(0);
    }
  }, [isActive]);

  const initial = name.charAt(0).toUpperCase();
  const halfSize = size / 2;
  const ringSize = size + 16;

  const renderWaveRing = (anim: Animated.Value, delay: number) => (
    <Animated.View
      style={[
        styles.waveRing,
        {
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
          borderColor: avatarColor,
          opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.2, 0] }),
          transform: [
            { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) },
          ],
        },
      ]}
    />
  );

  return (
    <View style={[styles.container, { width: ringSize * 1.8, height: ringSize * 1.8 }]}>
      {/* Wave rings */}
      {isActive && renderWaveRing(waveAnim1, 0)}
      {isActive && renderWaveRing(waveAnim2, 400)}

      {/* Glow */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: size + 12,
            height: size + 12,
            borderRadius: (size + 12) / 2,
            backgroundColor: avatarColor,
            opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] }),
          },
        ]}
      />

      {/* Avatar */}
      <Animated.View
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: halfSize,
            backgroundColor: avatarColor,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
      </Animated.View>

      {/* Active indicator dot */}
      {isActive && (
        <View style={[styles.activeDot, { backgroundColor: Colors.voiceListening }]} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  glow: {
    position: 'absolute',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  initial: {
    color: Colors.white,
    fontWeight: '700',
  },
  activeDot: {
    position: 'absolute',
    bottom: '18%',
    right: '28%',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.background,
  },
});

export default SpeakerAura;
