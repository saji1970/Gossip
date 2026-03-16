import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
} from '@react-native-voice/voice';
import { Colors, BorderRadius, Spacing } from '../../constants/theme';
import { parseCommand, getSuggestions, ScreenContext } from '../../modules/voice/VoiceCommandParser';

const { height: screenHeight } = Dimensions.get('window');

interface VoiceCommandOverlayProps {
  visible: boolean;
  onDismiss: () => void;
  onCommand: (type: string, payload: string) => void;
  context?: ScreenContext;
}

type ListenState = 'idle' | 'listening' | 'processing' | 'result' | 'error';

const VoiceCommandOverlay: React.FC<VoiceCommandOverlayProps> = ({
  visible,
  onDismiss,
  onCommand,
  context = 'global',
}) => {
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [listenState, setListenState] = useState<ListenState>('idle');
  const [partialText, setPartialText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Pulse animation for mic while listening
  useEffect(() => {
    if (listenState === 'listening') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [listenState]);

  // Wire up Voice callbacks
  useEffect(() => {
    const onSpeechResults = (e: SpeechResultsEvent) => {
      const text = e.value?.[0] || '';
      console.log('[VoiceOverlay] onSpeechResults:', text, 'all values:', e.value);
      setFinalText(text);
      setPartialText('');
      setListenState('result');
    };

    const onSpeechPartialResults = (e: SpeechResultsEvent) => {
      const text = e.value?.[0] || '';
      console.log('[VoiceOverlay] onSpeechPartialResults:', text);
      setPartialText(text);
    };

    const onSpeechError = (e: SpeechErrorEvent) => {
      console.log('[VoiceOverlay] onSpeechError:', JSON.stringify(e.error));
      const code = e.error?.code;
      // code 6 = no speech detected, code 7 = no match
      if (code === '6' || code === '7') {
        setErrorMsg('No speech detected. Tap the mic to try again.');
      } else {
        setErrorMsg(e.error?.message || 'Speech recognition error');
      }
      setListenState('error');
    };

    const onSpeechEnd = () => {
      console.log('[VoiceOverlay] onSpeechEnd');
      // Only transition if we're still in listening state (not already result/error)
      setListenState((prev) => (prev === 'listening' ? 'processing' : prev));
    };

    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechPartialResults;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechEnd = onSpeechEnd;

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  // Start listening when overlay becomes visible
  useEffect(() => {
    if (visible) {
      setFinalText('');
      setPartialText('');
      setErrorMsg('');
      setListenState('idle');

      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 10 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start(() => {
        // Auto-start listening after panel slides up
        startListening();
      });
    } else {
      Voice.stop().catch(() => {});
      Voice.cancel().catch(() => {});
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: screenHeight, duration: 200, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const startListening = useCallback(async () => {
    try {
      console.log('[VoiceOverlay] startListening called');
      setFinalText('');
      setPartialText('');
      setErrorMsg('');
      setListenState('listening');
      await Voice.start('en-US');
      console.log('[VoiceOverlay] Voice.start() succeeded');
    } catch (err: any) {
      console.log('[VoiceOverlay] Voice.start() error:', err.message);
      setErrorMsg(err.message || 'Could not start speech recognition');
      setListenState('error');
    }
  }, []);

  const stopListening = useCallback(async () => {
    try {
      await Voice.stop();
      setListenState('processing');
    } catch {
      // ignore
    }
  }, []);

  const executeCommand = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const cmd = parseCommand(trimmed);
      console.log('[VoiceOverlay] executeCommand:', JSON.stringify({ input: trimmed, parsed: cmd }));
      Alert.alert('Debug', `Heard: "${trimmed}"\nType: ${cmd.type}\nPayload: ${cmd.payload}`)
      onCommand(cmd.type, cmd.payload);

      // Auto-dismiss after executing
      setTimeout(() => onDismiss(), 600);
    },
    [onCommand, onDismiss],
  );

  // Auto-execute when we get a final result
  useEffect(() => {
    if (listenState === 'result' && finalText) {
      const timer = setTimeout(() => executeCommand(finalText), 800);
      return () => clearTimeout(timer);
    }
  }, [listenState, finalText, executeCommand]);

  const handleQuickAction = (suggestion: string) => {
    Voice.stop().catch(() => {});
    Voice.cancel().catch(() => {});
    const clean = suggestion.replace(/^"|"$/g, '').replace(/\s*\[.*?\]/g, '').trim();
    executeCommand(clean);
  };

  const suggestions = getSuggestions(context);

  if (!visible) return null;

  const renderStateContent = () => {
    switch (listenState) {
      case 'idle':
      case 'listening':
        return (
          <View style={styles.listeningContainer}>
            <Animated.View style={[styles.micCircle, { transform: [{ scale: pulseAnim }] }]}>
              <TouchableOpacity
                onPress={listenState === 'listening' ? stopListening : startListening}
                activeOpacity={0.7}
                style={styles.micTouchable}
              >
                <Text style={styles.micEmoji}>{'\u{1F3A4}'}</Text>
              </TouchableOpacity>
            </Animated.View>
            <Text style={styles.listeningLabel}>
              {listenState === 'listening' ? 'Listening...' : 'Tap to speak'}
            </Text>
            {partialText !== '' && (
              <Text style={styles.partialText}>{partialText}</Text>
            )}
          </View>
        );

      case 'processing':
        return (
          <View style={styles.listeningContainer}>
            <View style={styles.micCircleIdle}>
              <Text style={styles.micEmoji}>{'\u{1F3A4}'}</Text>
            </View>
            <Text style={styles.listeningLabel}>Processing...</Text>
            {partialText !== '' && (
              <Text style={styles.partialText}>{partialText}</Text>
            )}
          </View>
        );

      case 'result':
        return (
          <View style={styles.resultContainer}>
            <View style={styles.resultBox}>
              <Text style={styles.resultLabel}>Heard:</Text>
              <Text style={styles.resultText}>{finalText}</Text>
            </View>
            <Text style={styles.executingLabel}>Executing command...</Text>
          </View>
        );

      case 'error':
        return (
          <View style={styles.listeningContainer}>
            <TouchableOpacity
              onPress={startListening}
              activeOpacity={0.7}
              style={styles.micCircleError}
            >
              <Text style={styles.micEmoji}>{'\u{1F3A4}'}</Text>
            </TouchableOpacity>
            <Text style={styles.errorText}>{errorMsg}</Text>
            <Text style={styles.retryHint}>Tap the mic to try again</Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onDismiss} activeOpacity={1} />
      </Animated.View>

      <Animated.View style={[styles.panel, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.handle} />

        {renderStateContent()}

        {/* Quick actions */}
        <View style={styles.suggestions}>
          <Text style={styles.suggestionsTitle}>Or try saying:</Text>
          {suggestions.map((s, i) => (
            <TouchableOpacity key={i} onPress={() => handleQuickAction(s)} activeOpacity={0.6}>
              <Text style={styles.suggestionItem}>{s}</Text>
            </TouchableOpacity>
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
    minHeight: 380,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.textMuted,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.xl,
  },
  // ── Listening state ──
  listeningContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  micCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    elevation: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  micCircleIdle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  micCircleError: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  micTouchable: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micEmoji: {
    fontSize: 36,
  },
  listeningLabel: {
    fontSize: 18,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  partialText: {
    fontSize: 16,
    color: Colors.primary,
    fontStyle: 'italic',
    marginTop: Spacing.md,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  // ── Result state ──
  resultContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  resultBox: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    width: '100%',
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
    marginBottom: Spacing.md,
  },
  resultLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  resultText: {
    fontSize: 18,
    color: Colors.accent,
    fontWeight: '600',
  },
  executingLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  // ── Error state ──
  errorText: {
    fontSize: 16,
    color: Colors.danger,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  retryHint: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  // ── Quick actions ──
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
    color: Colors.primary,
    paddingVertical: Spacing.sm,
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
