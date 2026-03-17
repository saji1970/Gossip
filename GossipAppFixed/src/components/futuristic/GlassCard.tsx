import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: 'low' | 'medium' | 'high';
  noBorder?: boolean;
}

const INTENSITY_MAP = {
  low:    { bg: 'rgba(30, 41, 59, 0.35)', border: 'rgba(148, 163, 184, 0.1)' },
  medium: { bg: 'rgba(30, 41, 59, 0.55)', border: 'rgba(148, 163, 184, 0.2)' },
  high:   { bg: 'rgba(30, 41, 59, 0.75)', border: 'rgba(148, 163, 184, 0.3)' },
};

const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = 'medium',
  noBorder = false,
}) => {
  const colors = INTENSITY_MAP[intensity];
  return (
    <View
      style={[
        glassStyles.card,
        {
          backgroundColor: colors.bg,
          borderColor: noBorder ? 'transparent' : colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const glassStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
  },
});

export default GlassCard;
