import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Colors, BorderRadius, Spacing } from '../../constants/theme';
import { useVoice } from '../../hooks/useVoice';
import { parseCommand, getSuggestions, ScreenContext } from '../../modules/voice/VoiceCommandParser';
import VoiceButton from './VoiceButton';

const { height: screenHeight } = Dimensions.get('window');

interface VoiceCommandOverlayProps {
  visible: boolean;
  onDismiss: () => void;
  onCommand: (type: string, payload: string) => void;
  context?: ScreenContext;
}

const VoiceCommandOverlay: React.FC<VoiceCommandOverlayProps> = ({
  visible,
  onDismiss,
  onCommand,
  context = 'global',
}) => {
  const { voiceState, isListening, startListening, stopListening, lastResult } = useVoice();
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const lastProcessedRef = useRef(0);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 10 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: screenHeight, duration: 200, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  // Handle voice results → parse into commands
  useEffect(() => {
    if (lastResult && lastResult.timestamp > lastProcessedRef.current) {
      lastProcessedRef.current = lastResult.timestamp;
      const cmd = parseCommand(lastResult.text);
      onCommand(cmd.type, cmd.payload);

      // Auto-dismiss after executing
      setTimeout(() => onDismiss(), 800);
    }
  }, [lastResult]);

  const handleVoicePress = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const suggestions = getSuggestions(context);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onDismiss} activeOpacity={1} />
      </Animated.View>

      <Animated.View style={[styles.panel, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.handle} />

        {/* Result display */}
        {lastResult && lastResult.timestamp === lastProcessedRef.current && (
          <View style={styles.resultBox}>
            <Text style={styles.resultText}>{lastResult.text}</Text>
          </View>
        )}

        {/* Voice button */}
        <View style={styles.voiceArea}>
          <VoiceButton voiceState={voiceState} onPress={handleVoicePress} size="large" />
          <Text style={styles.statusText}>
            {voiceState === 'listening' ? 'Listening...' :
             voiceState === 'processing' ? 'Processing...' :
             'Tap to speak a command'}
          </Text>
        </View>

        {/* Suggestions */}
        <View style={styles.suggestions}>
          <Text style={styles.suggestionsTitle}>Try saying:</Text>
          {suggestions.map((s, i) => (
            <Text key={i} style={styles.suggestionItem}>{s}</Text>
          ))}
        </View>

        <TouchableOpacity style={styles.cancelButton} onPress={onDismiss}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
  },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl + 10,
    minHeight: 360,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.textMuted,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.xl,
  },
  resultBox: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  resultText: {
    fontSize: 20,
    color: Colors.accent,
    fontWeight: '600',
  },
  voiceArea: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  statusText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  suggestions: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  suggestionsTitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  suggestionItem: {
    fontSize: 16,
    color: Colors.textSecondary,
    paddingVertical: Spacing.xs,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  cancelText: {
    fontSize: 16,
    color: Colors.textMuted,
    fontWeight: '500',
  },
});

export default VoiceCommandOverlay;
