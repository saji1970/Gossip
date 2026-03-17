import React, { useEffect, useRef, useMemo } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

interface StarFieldBackgroundProps {
  children: React.ReactNode;
  starCount?: number;
  showRadialGlow?: boolean;
  glowColor?: string;
}

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  delay: number;
  duration: number;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Deterministic star generation
function generateStars(count: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const seed = (i * 7919 + 1031) % 10007;
    stars.push({
      x: (seed % SCREEN_W),
      y: ((seed * 3) % SCREEN_H),
      size: 1 + (seed % 3),
      opacity: 0.3 + ((seed % 7) / 10),
      delay: (seed % 3000),
      duration: 2000 + (seed % 3000),
    });
  }
  return stars;
}

const StarFieldBackground: React.FC<StarFieldBackgroundProps> = ({
  children,
  starCount = 40,
  showRadialGlow = true,
  glowColor = 'rgba(129, 140, 248, 0.08)',
}) => {
  const stars = useMemo(() => generateStars(starCount), [starCount]);
  const anims = useRef(stars.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = stars.map((star, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(star.delay),
          Animated.timing(anims[i], {
            toValue: 1,
            duration: star.duration,
            useNativeDriver: true,
          }),
          Animated.timing(anims[i], {
            toValue: 0,
            duration: star.duration,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, []);

  return (
    <View style={sfStyles.container}>
      {/* Gradient layers */}
      <View style={sfStyles.gradientTop} />
      <View style={sfStyles.gradientMid} />
      <View style={sfStyles.gradientBottom} />

      {/* Stars */}
      {stars.map((star, i) => {
        const opacity = anims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [star.opacity * 0.3, star.opacity],
        });
        return (
          <Animated.View
            key={i}
            style={[
              sfStyles.star,
              {
                left: star.x,
                top: star.y,
                width: star.size,
                height: star.size,
                borderRadius: star.size / 2,
                opacity,
              },
            ]}
          />
        );
      })}

      {/* Radial glow behind center-bottom (mic area) */}
      {showRadialGlow && (
        <View style={[sfStyles.radialGlow, { backgroundColor: glowColor }]} />
      )}

      {/* Content */}
      <View style={sfStyles.content}>{children}</View>
    </View>
  );
};

const sfStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  gradientTop: {
    ...StyleSheet.absoluteFillObject,
    height: SCREEN_H * 0.35,
    backgroundColor: '#020617',
  },
  gradientMid: {
    position: 'absolute',
    top: SCREEN_H * 0.25,
    left: 0,
    right: 0,
    height: SCREEN_H * 0.5,
    backgroundColor: '#0B1A2F',
    opacity: 0.6,
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_H * 0.35,
    backgroundColor: '#020617',
  },
  star: {
    position: 'absolute',
    backgroundColor: '#E2E8F0',
  },
  radialGlow: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.5,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});

export default StarFieldBackground;
