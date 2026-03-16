import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, ScrollView } from 'react-native';
import { Colors, BorderRadius, Spacing } from '../../constants/theme';

interface PredictiveSuggestionsProps {
  suggestions: string[];
  onSelect: (text: string, index: number) => void;
  visible: boolean;
  loading?: boolean;
}

const PredictiveSuggestions: React.FC<PredictiveSuggestionsProps> = ({
  suggestions,
  onSelect,
  visible,
  loading = false,
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible && (suggestions.length > 0 || loading) ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, suggestions.length, loading]);

  if (!visible && suggestions.length === 0 && !loading) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: slideAnim,
          transform: [{
            translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }),
          }],
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.aiIcon}>{'✦'}</Text>
        <Text style={styles.label}>Suggested replies</Text>
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <View style={styles.loadingDot} />
          <View style={[styles.loadingDot, styles.loadingDot2]} />
          <View style={[styles.loadingDot, styles.loadingDot3]} />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {suggestions.map((text, index) => (
            <TouchableOpacity
              key={`${index}-${text}`}
              style={styles.chip}
              onPress={() => onSelect(text, index)}
              activeOpacity={0.7}
            >
              <Text style={styles.chipNumber}>{index + 1}</Text>
              <Text style={styles.chipText} numberOfLines={2}>{text}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  aiIcon: {
    fontSize: 12,
    color: Colors.primary,
    marginRight: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsRow: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.primary}15`,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxWidth: 220,
  },
  chipNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    backgroundColor: `${Colors.primary}20`,
    width: 20,
    height: 20,
    borderRadius: 10,
    textAlign: 'center',
    lineHeight: 20,
    marginRight: Spacing.sm,
    overflow: 'hidden',
  },
  chipText: {
    fontSize: 14,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  loadingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    gap: 6,
  },
  loadingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    opacity: 0.4,
  },
  loadingDot2: {
    opacity: 0.6,
  },
  loadingDot3: {
    opacity: 0.8,
  },
});

export default PredictiveSuggestions;
