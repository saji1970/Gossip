import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
} from '@react-native-voice/voice';
import Tts from 'react-native-tts';
import { Colors, BorderRadius, Spacing } from '../../constants/theme';
import { getSuggestions, ScreenContext } from '../../modules/voice/VoiceCommandParser';
import { useGossipBot } from '../../hooks/useGossipBot';
import { GossipResponse, GossipOption, GossipResponseType } from '../../modules/gossip/types';
import { Group } from '../../utils/GroupStorage';

const { height: screenHeight } = Dimensions.get('window');

interface VoiceCommandOverlayProps {
  visible: boolean;
  onDismiss: () => void;
  onCommand: (type: string, payload: string) => void;
  context?: ScreenContext;
  currentScreen?: string;
  currentGroup?: Group;
}

type ListenState = 'idle' | 'listening' | 'processing' | 'result' | 'error';

const VoiceCommandOverlay: React.FC<VoiceCommandOverlayProps> = ({
  visible,
  onDismiss,
  onCommand,
  context = 'global',
  currentScreen = 'MainTabs',
  currentGroup,
}) => {
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [listenState, setListenState] = useState<ListenState>('idle');
  const [partialText, setPartialText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // ── Conversation mode state ──
  const [conversationMode, setConversationMode] = useState(false);
  const [gossipMessage, setGossipMessage] = useState('');
  const [gossipOptions, setGossipOptions] = useState<GossipOption[]>([]);
  const [gossipResponseType, setGossipResponseType] = useState<GossipResponseType | null>(null);

  const { processInput, reset: resetGossipBot } = useGossipBot();

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
        // In conversation mode, stay in conversation mode on no-speech
        if (conversationMode) {
          setListenState('idle');
          return;
        }
        setErrorMsg('No speech detected. Tap the mic to try again.');
      } else {
        setErrorMsg(e.error?.message || 'Speech recognition error');
      }
      setListenState('error');
    };

    const onSpeechEnd = () => {
      console.log('[VoiceOverlay] onSpeechEnd');
      setListenState((prev) => (prev === 'listening' ? 'processing' : prev));
    };

    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechPartialResults;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechEnd = onSpeechEnd;

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [conversationMode]);

  // Start listening when overlay becomes visible
  useEffect(() => {
    if (visible) {
      setFinalText('');
      setPartialText('');
      setErrorMsg('');
      setListenState('idle');
      setConversationMode(false);
      setGossipMessage('');
      setGossipOptions([]);
      setGossipResponseType(null);

      startListening();

      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 9 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
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
      try {
        await Voice.cancel();
      } catch {
        // ignore
      }
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

  // ── GossipBot-powered command execution ──
  const executeCommand = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      console.log('[VoiceOverlay] executeCommand via GossipBot:', trimmed);

      try {
        const response = await processInput(trimmed, currentScreen, currentGroup);
        handleGossipResponse(response);
      } catch (err) {
        console.error('[VoiceOverlay] GossipBot error:', err);
        // Fallback: just show unknown
        setConversationMode(true);
        setGossipMessage('Something went wrong ngl. Try again?');
        setGossipOptions([]);
        setGossipResponseType('unknown');
        setListenState('idle');
      }
    },
    [processInput, currentScreen, currentGroup, onCommand, onDismiss],
  );

  const handleGossipResponse = useCallback(
    (response: GossipResponse) => {
      console.log('[VoiceOverlay] GossipBot response:', response.type, response.message);

      switch (response.type) {
        case 'execute': {
          // Direct execution — run the command and dismiss
          if (response.command) {
            onCommand(response.command.type, response.command.payload);
          }
          setTimeout(() => handleDismiss(), 600);
          break;
        }

        case 'clarify':
        case 'unknown': {
          // Enter conversation mode — show Gossip's message + options
          setConversationMode(true);
          setGossipMessage(response.message);
          setGossipOptions(response.options || []);
          setGossipResponseType(response.type);
          setListenState('idle');

          // TTS speak the message
          try {
            Tts.stop();
            Tts.speak(response.message);
          } catch {
            // TTS not critical
          }
          break;
        }

        case 'info': {
          // Show informational message, auto-dismiss after 5s
          setConversationMode(true);
          setGossipMessage(response.message);
          setGossipOptions([]);
          setGossipResponseType('info');
          setListenState('idle');

          try {
            Tts.stop();
            Tts.speak(response.message);
          } catch {
            // TTS not critical
          }

          setTimeout(() => handleDismiss(), 5000);
          break;
        }
      }
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

  const handleOptionTap = useCallback(
    (option: GossipOption) => {
      console.log('[VoiceOverlay] Option tapped:', option.label);
      try { Tts.stop(); } catch {}

      if (option.command) {
        onCommand(option.command.type, option.command.payload);
      }
      setTimeout(() => handleDismiss(), 400);
    },
    [onCommand],
  );

  const handleDismiss = useCallback(() => {
    try { Tts.stop(); } catch {}
    resetGossipBot();
    setConversationMode(false);
    setGossipMessage('');
    setGossipOptions([]);
    setGossipResponseType(null);
    onDismiss();
  }, [onDismiss, resetGossipBot]);

  const handleFollowUpMic = useCallback(async () => {
    try { Tts.stop(); } catch {}
    // Start listening for a follow-up voice response
    startListening();
  }, [startListening]);

  const suggestions = getSuggestions(context);

  if (!visible) return null;

  // ── Conversation mode rendering ──
  const renderConversationContent = () => {
    return (
      <View style={styles.conversationContainer}>
        {/* Gossip chat bubble */}
        <View style={styles.gossipBubble}>
          <Text style={styles.gossipLabel}>Gossip</Text>
          <Text style={styles.gossipMessageText}>{gossipMessage}</Text>
        </View>

        {/* Option pills */}
        {gossipOptions.length > 0 && (
          <ScrollView
            style={styles.optionsScroll}
            contentContainerStyle={styles.optionsContainer}
            showsVerticalScrollIndicator={false}
          >
            {gossipOptions.map((option, i) => (
              <TouchableOpacity
                key={i}
                style={styles.optionPill}
                onPress={() => handleOptionTap(option)}
                activeOpacity={0.7}
              >
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Follow-up mic button (for clarify/unknown only) */}
        {(gossipResponseType === 'clarify' || gossipResponseType === 'unknown') && (
          <View style={styles.followUpContainer}>
            {listenState === 'listening' ? (
              <View style={styles.followUpListening}>
                <Animated.View style={[styles.followUpMic, styles.followUpMicActive, { transform: [{ scale: pulseAnim }] }]}>
                  <TouchableOpacity onPress={stopListening} activeOpacity={0.7} style={styles.followUpMicTouchable}>
                    <Text style={styles.followUpMicEmoji}>{'\u{1F3A4}'}</Text>
                  </TouchableOpacity>
                </Animated.View>
                <Text style={styles.followUpHint}>Listening...</Text>
                {partialText !== '' && (
                  <Text style={styles.partialText}>{partialText}</Text>
                )}
              </View>
            ) : listenState === 'processing' ? (
              <View style={styles.followUpListening}>
                <View style={[styles.followUpMic, styles.followUpMicIdle]}>
                  <Text style={styles.followUpMicEmoji}>{'\u{1F3A4}'}</Text>
                </View>
                <Text style={styles.followUpHint}>Processing...</Text>
              </View>
            ) : (
              <View style={styles.followUpListening}>
                <TouchableOpacity
                  style={[styles.followUpMic]}
                  onPress={handleFollowUpMic}
                  activeOpacity={0.7}
                >
                  <Text style={styles.followUpMicEmoji}>{'\u{1F3A4}'}</Text>
                </TouchableOpacity>
                <Text style={styles.followUpHint}>Or tap to reply by voice</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderStateContent = () => {
    // If in conversation mode, show conversation UI
    if (conversationMode) {
      return renderConversationContent();
    }

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
            <Text style={styles.executingLabel}>Processing with Gossip...</Text>
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
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleDismiss} activeOpacity={1} />
      </Animated.View>

      <Animated.View style={[styles.panel, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.handle} />

        {renderStateContent()}

        {/* Quick actions — hide in conversation mode */}
        {!conversationMode && (
          <View style={styles.suggestions}>
            <Text style={styles.suggestionsTitle}>Or try saying:</Text>
            {suggestions.map((s, i) => (
              <TouchableOpacity key={i} onPress={() => handleQuickAction(s)} activeOpacity={0.6}>
                <Text style={styles.suggestionItem}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.cancelButton} onPress={handleDismiss}>
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
    maxHeight: screenHeight * 0.75,
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
  // ── Conversation mode ──
  conversationContainer: {
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  gossipBubble: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    marginBottom: Spacing.lg,
  },
  gossipLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: Spacing.xs,
  },
  gossipMessageText: {
    fontSize: 16,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  optionsScroll: {
    maxHeight: 200,
  },
  optionsContainer: {
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  optionPill: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 56,
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  optionDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  // ── Follow-up mic ──
  followUpContainer: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  followUpListening: {
    alignItems: 'center',
  },
  followUpMic: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  followUpMicActive: {
    backgroundColor: Colors.primary,
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  followUpMicIdle: {
    backgroundColor: Colors.surfaceLight,
  },
  followUpMicTouchable: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followUpMicEmoji: {
    fontSize: 24,
  },
  followUpHint: {
    fontSize: 13,
    color: Colors.textMuted,
  },
});

export default VoiceCommandOverlay;
