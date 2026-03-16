import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Colors } from '../../constants/theme';

export type OrbState = 'idle' | 'listening' | 'processing' | 'responding';

interface AIOrbProps {
  state: OrbState;
  size?: number;
}

const STATE_COLORS: Record<OrbState, string> = {
  idle: Colors.primary,
  listening: Colors.voiceListening,
  processing: Colors.voiceProcessing,
  responding: Colors.accent,
};

const AIOrb: React.FC<AIOrbProps> = ({ state, size = 44 }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Stop previous
    scaleAnim.stopAnimation();
    opacityAnim.stopAnimation();
    ringScale.stopAnimation();
    ringOpacity.stopAnimation();

    switch (state) {
      case 'idle':
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.6, duration: 300, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start();
        break;

      case 'listening':
        Animated.parallel([
          Animated.loop(
            Animated.sequence([
              Animated.timing(scaleAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
              Animated.timing(scaleAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            ])
          ),
          Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.loop(
            Animated.sequence([
              Animated.timing(ringScale, { toValue: 2, duration: 1000, useNativeDriver: true }),
              Animated.timing(ringScale, { toValue: 1, duration: 0, useNativeDriver: true }),
            ])
          ),
          Animated.loop(
            Animated.sequence([
              Animated.timing(ringOpacity, { toValue: 0.4, duration: 0, useNativeDriver: true }),
              Animated.timing(ringOpacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
            ])
          ),
        ]).start();
        break;

      case 'processing':
        Animated.parallel([
          Animated.loop(
            Animated.sequence([
              Animated.timing(scaleAnim, { toValue: 0.85, duration: 300, useNativeDriver: true }),
              Animated.timing(scaleAnim, { toValue: 1.1, duration: 300, useNativeDriver: true }),
            ])
          ),
          Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        ]).start();
        break;

      case 'responding':
        Animated.parallel([
          Animated.loop(
            Animated.sequence([
              Animated.timing(scaleAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
              Animated.timing(scaleAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            ])
          ),
          Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.loop(
            Animated.sequence([
              Animated.timing(ringScale, { toValue: 1.6, duration: 1600, useNativeDriver: true }),
              Animated.timing(ringScale, { toValue: 1, duration: 0, useNativeDriver: true }),
            ])
          ),
          Animated.loop(
            Animated.sequence([
              Animated.timing(ringOpacity, { toValue: 0.3, duration: 0, useNativeDriver: true }),
              Animated.timing(ringOpacity, { toValue: 0, duration: 1600, useNativeDriver: true }),
            ])
          ),
        ]).start();
        break;
    }
  }, [state]);

  const color = STATE_COLORS[state];
  const half = size / 2;

  return (
    <View style={[styles.container, { width: size * 2, height: size * 2 }]}>
      {/* Ripple ring */}
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: half,
            borderColor: color,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />

      {/* Outer glow */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: size + 8,
            height: size + 8,
            borderRadius: (size + 8) / 2,
            backgroundColor: color,
            opacity: opacityAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.15] }),
          },
        ]}
      />

      {/* Core orb */}
      <Animated.View
        style={[
          styles.orb,
          {
            width: size,
            height: size,
            borderRadius: half,
            backgroundColor: color,
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={[styles.innerHighlight, { width: size * 0.4, height: size * 0.4, borderRadius: size * 0.2 }]} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
  glow: {
    position: 'absolute',
  },
  orb: {
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  innerHighlight: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    position: 'absolute',
    top: '15%',
    left: '15%',
  },
});

export default AIOrb;
