import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface VoiceWaveformProps {
  isActive?: boolean;
  barCount?: number;
  color?: string;
  height?: number;
  width?: number;
}

const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
  isActive = false,
  barCount = 24,
  color = '#818CF8',
  height = 40,
  width,
}) => {
  const anims = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.15)),
  ).current;

  useEffect(() => {
    if (!isActive) {
      // Settle to a flat line
      anims.forEach(a => {
        Animated.timing(a, {
          toValue: 0.15,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
      return;
    }

    const animations = anims.map((anim, i) => {
      // Create unique heights per bar using deterministic pattern
      const peak = 0.4 + ((i * 7 + 3) % 5) / 8;
      return Animated.loop(
        Animated.sequence([
          Animated.delay(i * 40),
          Animated.timing(anim, {
            toValue: peak,
            duration: 200 + (i % 4) * 60,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.15 + ((i * 3) % 4) / 15,
            duration: 200 + (i % 3) * 80,
            useNativeDriver: true,
          }),
        ]),
      );
    });

    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, [isActive]);

  const barGap = 3;
  const barWidth = 3;
  const totalWidth = width || barCount * (barWidth + barGap);

  return (
    <View style={[wfStyles.container, { height, width: totalWidth }]}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            wfStyles.bar,
            {
              width: barWidth,
              height,
              backgroundColor: color,
              transform: [{ scaleY: anim }],
              opacity: anim.interpolate({
                inputRange: [0.15, 1],
                outputRange: [0.4, 1],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
};

const wfStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  bar: {
    borderRadius: 2,
  },
});

export default VoiceWaveform;
