import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ViewStyle } from 'react-native';

interface GlowingIconButtonProps {
  icon: string;
  onPress?: () => void;
  size?: number;
  glowColor?: string;
  active?: boolean;
  label?: string;
  style?: ViewStyle;
}

const GlowingIconButton: React.FC<GlowingIconButtonProps> = ({
  icon,
  onPress,
  size = 48,
  glowColor = 'rgba(129, 140, 248, 0.3)',
  active = false,
  label,
  style,
}) => {
  return (
    <View style={[btnStyles.wrapper, style]}>
      {/* Glow effect when active */}
      {active && (
        <View
          style={[
            btnStyles.glow,
            {
              width: size + 16,
              height: size + 16,
              borderRadius: (size + 16) / 2,
              backgroundColor: glowColor,
            },
          ]}
        />
      )}
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={[
          btnStyles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          active && btnStyles.buttonActive,
        ]}
      >
        <Text style={[btnStyles.icon, { fontSize: size * 0.45 }]}>{icon}</Text>
      </TouchableOpacity>
      {label && (
        <Text style={btnStyles.label}>{label}</Text>
      )}
    </View>
  );
};

const btnStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    opacity: 0.5,
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
  icon: {
    color: '#E2E8F0',
  },
  label: {
    fontSize: 11,
    color: 'rgba(226, 232, 240, 0.6)',
    marginTop: 4,
    fontWeight: '500',
  },
});

export default GlowingIconButton;
