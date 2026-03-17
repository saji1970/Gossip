import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface VoiceActivityRingProps {
  isActive?: boolean;
  size?: number;
  color?: string;
  barCount?: number;
}

const VoiceActivityRing: React.FC<VoiceActivityRingProps> = ({
  isActive = false,
  size = 60,
  color = '#818CF8',
  barCount = 12,
}) => {
  const anims = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.3)),
  ).current;

  useEffect(() => {
    if (!isActive) {
      anims.forEach(a => a.setValue(0.3));
      return;
    }

    const animations = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 80),
          Animated.timing(anim, {
            toValue: 1,
            duration: 300 + (i % 3) * 100,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.3,
            duration: 300 + (i % 3) * 100,
            useNativeDriver: true,
          }),
        ]),
      ),
    );

    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, [isActive]);

  const radius = size / 2 - 6;
  const barWidth = 2.5;
  const barMaxHeight = 10;

  return (
    <View style={[ringStyles.container, { width: size, height: size }]}>
      {anims.map((anim, i) => {
        const angle = (i / barCount) * 360;
        const rad = (angle * Math.PI) / 180;
        const cx = size / 2 + Math.cos(rad) * radius - barWidth / 2;
        const cy = size / 2 + Math.sin(rad) * radius - barMaxHeight / 2;

        const scaleY = anim.interpolate({
          inputRange: [0.3, 1],
          outputRange: [0.3, 1],
        });

        return (
          <Animated.View
            key={i}
            style={[
              ringStyles.bar,
              {
                left: cx,
                top: cy,
                width: barWidth,
                height: barMaxHeight,
                backgroundColor: color,
                transform: [
                  { rotate: `${angle + 90}deg` },
                  { scaleY },
                ],
                opacity: anim,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const ringStyles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  bar: {
    position: 'absolute',
    borderRadius: 2,
  },
});

export default VoiceActivityRing;
