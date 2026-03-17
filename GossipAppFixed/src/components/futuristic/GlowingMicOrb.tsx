import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet, Text } from 'react-native';

type OrbState = 'idle' | 'listening' | 'processing';

interface GlowingMicOrbProps {
  state?: OrbState;
  size?: number;
  onPress?: () => void;
  primaryColor?: string;
  accentColor?: string;
}

const STATE_COLORS: Record<OrbState, { ring: string; glow: string }> = {
  idle:       { ring: '#818CF8', glow: 'rgba(129, 140, 248, 0.25)' },
  listening:  { ring: '#34D399', glow: 'rgba(52, 211, 153, 0.30)' },
  processing: { ring: '#FB923C', glow: 'rgba(251, 146, 60, 0.25)' },
};

const GlowingMicOrb: React.FC<GlowingMicOrbProps> = ({
  state = 'idle',
  size = 140,
  onPress,
  primaryColor,
  accentColor,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  const colors = {
    ring: primaryColor || STATE_COLORS[state].ring,
    glow: STATE_COLORS[state].glow,
  };

  useEffect(() => {
    // Pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: state === 'listening' ? 1.12 : 1.05,
          duration: state === 'listening' ? 800 : 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: state === 'listening' ? 800 : 2000,
          useNativeDriver: true,
        }),
      ]),
    );

    // Glow pulse
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: state === 'listening' ? 600 : 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: state === 'listening' ? 600 : 1500,
          useNativeDriver: true,
        }),
      ]),
    );

    // Rotate for processing
    const rotate = state === 'processing'
      ? Animated.loop(
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
        )
      : null;

    pulse.start();
    glow.start();
    rotate?.start();

    return () => {
      pulse.stop();
      glow.stop();
      rotate?.stop();
      pulseAnim.setValue(1);
      glowAnim.setValue(0.4);
      rotateAnim.setValue(0);
    };
  }, [state]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const outerGlowSize = size * 1.6;
  const innerGlowSize = size * 1.25;
  const ringWidth = 2.5;

  return (
    <View style={[orbStyles.wrapper, { width: outerGlowSize, height: outerGlowSize }]}>
      {/* Outer glow layer */}
      <Animated.View
        style={[
          orbStyles.outerGlow,
          {
            width: outerGlowSize,
            height: outerGlowSize,
            borderRadius: outerGlowSize / 2,
            backgroundColor: colors.glow,
            opacity: glowAnim,
          },
        ]}
      />

      {/* Inner glow layer */}
      <Animated.View
        style={[
          orbStyles.innerGlow,
          {
            width: innerGlowSize,
            height: innerGlowSize,
            borderRadius: innerGlowSize / 2,
            backgroundColor: colors.glow,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />

      {/* Glass orb */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={[
          orbStyles.orb,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        {/* Animated ring border */}
        <Animated.View
          style={[
            orbStyles.ring,
            {
              width: size - 4,
              height: size - 4,
              borderRadius: (size - 4) / 2,
              borderWidth: ringWidth,
              borderColor: colors.ring,
              transform: state === 'processing' ? [{ rotate: spin }] : [],
            },
          ]}
        />

        {/* Mic icon */}
        <Text style={orbStyles.micIcon}>
          {state === 'listening' ? '\u{1F50A}' : state === 'processing' ? '\u23F3' : '\u{1F399}'}
        </Text>

        {/* Glass highlight */}
        <View style={orbStyles.highlight} />
      </TouchableOpacity>
    </View>
  );
};

const orbStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerGlow: {
    position: 'absolute',
  },
  innerGlow: {
    position: 'absolute',
  },
  orb: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    borderStyle: 'solid',
  },
  micIcon: {
    fontSize: 36,
    zIndex: 2,
  },
  highlight: {
    position: 'absolute',
    top: 8,
    left: '15%',
    width: '40%',
    height: '25%',
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
});

export default GlowingMicOrb;
