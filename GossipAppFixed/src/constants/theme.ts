// Dark, high-contrast design system for AI glasses

export const Colors = {
  // Core dark palette
  background: '#0F172A',
  surface: '#1E293B',
  surfaceLight: '#334155',
  border: '#475569',

  // Primary & accent
  primary: '#818CF8',
  primaryDark: '#6366F1',
  accent: '#34D399',
  accentDark: '#10B981',

  // Text
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0F172A',

  // Voice state colors
  voiceIdle: '#818CF8',
  voiceListening: '#34D399',
  voiceProcessing: '#FB923C',
  voiceError: '#F87171',

  // Message bubbles
  ownBubble: '#312E81',
  otherBubble: '#1E293B',
  ownBubbleText: '#E0E7FF',
  otherBubbleText: '#E2E8F0',

  // Semantic
  danger: '#F87171',
  dangerDark: '#EF4444',
  warning: '#FB923C',
  success: '#34D399',
  info: '#60A5FA',

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(15, 23, 42, 0.85)',
};

export const Typography = {
  // Headers
  h1: { fontSize: 32, fontWeight: '700' as const, color: Colors.textPrimary },
  h2: { fontSize: 28, fontWeight: '700' as const, color: Colors.textPrimary },
  h3: { fontSize: 24, fontWeight: '600' as const, color: Colors.textPrimary },

  // Body — larger for glasses readability
  bodyLarge: { fontSize: 20, fontWeight: '400' as const, lineHeight: 28, color: Colors.textPrimary },
  body: { fontSize: 18, fontWeight: '400' as const, lineHeight: 26, color: Colors.textPrimary },
  bodySmall: { fontSize: 16, fontWeight: '400' as const, lineHeight: 22, color: Colors.textSecondary },

  // Labels
  label: { fontSize: 18, fontWeight: '600' as const, color: Colors.textPrimary },
  labelSmall: { fontSize: 16, fontWeight: '600' as const, color: Colors.textSecondary },

  // Buttons
  button: { fontSize: 18, fontWeight: '600' as const, color: Colors.white },
  buttonSmall: { fontSize: 16, fontWeight: '600' as const, color: Colors.white },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const VoiceButtonSizes = {
  large: { size: 80, iconSize: 36 },
  medium: { size: 64, iconSize: 28 },
  small: { size: 48, iconSize: 22 },
};

export const TouchTargets = {
  min: 56,
  tabBar: 80,
  button: 56,
  listItem: 72,
};
