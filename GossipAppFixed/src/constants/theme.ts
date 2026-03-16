// Dark, high-contrast design system for AI glasses

export type AccentName = 'indigo' | 'ocean' | 'forest' | 'sunset' | 'rose';
export type ThemeMode = 'dark' | 'light';

export interface AccentPreset {
  name: AccentName;
  label: string;
  primary: string;
  primaryDark: string;
  accent: string;
  accentDark: string;
}

export const ACCENT_PRESETS: Record<AccentName, AccentPreset> = {
  indigo: { name: 'indigo', label: 'Indigo', primary: '#818CF8', primaryDark: '#6366F1', accent: '#34D399', accentDark: '#10B981' },
  ocean:  { name: 'ocean',  label: 'Ocean',  primary: '#38BDF8', primaryDark: '#0EA5E9', accent: '#2DD4BF', accentDark: '#14B8A6' },
  forest: { name: 'forest', label: 'Forest', primary: '#4ADE80', primaryDark: '#22C55E', accent: '#A3E635', accentDark: '#84CC16' },
  sunset: { name: 'sunset', label: 'Sunset', primary: '#FB923C', primaryDark: '#F97316', accent: '#FBBF24', accentDark: '#F59E0B' },
  rose:   { name: 'rose',   label: 'Rose',   primary: '#FB7185', primaryDark: '#F43F5E', accent: '#FDA4AF', accentDark: '#FB7185' },
};

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function buildColors(mode: ThemeMode, accentName: AccentName) {
  const a = ACCENT_PRESETS[accentName];

  if (mode === 'light') {
    return {
      background: '#F8FAFC',
      surface: '#FFFFFF',
      surfaceLight: '#F1F5F9',
      border: '#E2E8F0',
      primary: a.primary,
      primaryDark: a.primaryDark,
      accent: a.accent,
      accentDark: a.accentDark,
      textPrimary: '#0F172A',
      textSecondary: '#475569',
      textMuted: '#94A3B8',
      textInverse: '#F1F5F9',
      voiceIdle: a.primary,
      voiceListening: a.accent,
      voiceProcessing: '#FB923C',
      voiceError: '#F87171',
      ownBubble: hexToRgba(a.primaryDark, 0.2),
      otherBubble: '#F1F5F9',
      ownBubbleText: '#1E293B',
      otherBubbleText: '#1E293B',
      danger: '#F87171',
      dangerDark: '#EF4444',
      warning: '#FB923C',
      success: '#34D399',
      info: '#60A5FA',
      headerBar: '#FFFFFF',
      unreadBadge: '#E87A6D',
      tabActivePill: hexToRgba(a.primary, 0.1),
      white: '#FFFFFF',
      black: '#000000',
      overlay: 'rgba(0, 0, 0, 0.3)',
    };
  }

  // Dark mode
  return {
    background: '#0F172A',
    surface: '#1E293B',
    surfaceLight: '#334155',
    border: '#475569',
    primary: a.primary,
    primaryDark: a.primaryDark,
    accent: a.accent,
    accentDark: a.accentDark,
    textPrimary: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textInverse: '#0F172A',
    voiceIdle: a.primary,
    voiceListening: a.accent,
    voiceProcessing: '#FB923C',
    voiceError: '#F87171',
    ownBubble: '#312E81',
    otherBubble: '#1E293B',
    ownBubbleText: '#E0E7FF',
    otherBubbleText: '#E2E8F0',
    danger: '#F87171',
    dangerDark: '#EF4444',
    warning: '#FB923C',
    success: '#34D399',
    info: '#60A5FA',
    headerBar: '#404E7C',
    unreadBadge: '#E87A6D',
    tabActivePill: '#1E2D4A',
    white: '#FFFFFF',
    black: '#000000',
    overlay: 'rgba(15, 23, 42, 0.85)',
  };
}

// Mutable Colors object — default dark + indigo.
// ThemeContext will mutate this in-place so all existing `Colors.xxx` imports stay reactive.
export const Colors: Record<string, string> = buildColors('dark', 'indigo');

/** Mutate the `Colors` object in-place to reflect a new mode + accent. */
export function applyTheme(mode: ThemeMode, accentName: AccentName): void {
  const next = buildColors(mode, accentName);
  for (const key of Object.keys(next)) {
    (Colors as any)[key] = (next as any)[key];
  }
}

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
