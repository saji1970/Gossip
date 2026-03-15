import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { ReplySuggestion } from '../../modules/personality/types';
import { Colors, BorderRadius, Spacing } from '../../constants/theme';

interface ReplySuggestionsProps {
  suggestions: ReplySuggestion[];
  onSelect: (text: string) => void;
  visible: boolean;
}

const ReplySuggestions: React.FC<ReplySuggestionsProps> = ({
  suggestions,
  onSelect,
  visible,
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible && suggestions.length > 0 ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [visible, suggestions.length, slideAnim]);

  if (!visible || suggestions.length === 0) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: slideAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {suggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={`${suggestion.text}-${index}`}
            style={styles.chip}
            onPress={() => onSelect(suggestion.text)}
            activeOpacity={0.7}
          >
            {suggestion.emoji && (
              <Text style={styles.chipEmoji}>{suggestion.emoji}</Text>
            )}
            <Text style={styles.chipText}>{suggestion.text}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xs,
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
  },
  chipEmoji: {
    fontSize: 16,
    marginRight: Spacing.xs,
  },
  chipText: {
    color: Colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ReplySuggestions;
