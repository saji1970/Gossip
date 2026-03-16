import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import AIOrb, { OrbState } from './AIOrb';

interface GlassesHUDProps {
  activeSpeaker?: string;
  lastMessage?: string;
  lastSender?: string;
  aiSuggestion?: string;
  voiceState: OrbState;
  visible: boolean;
}

const GlassesHUD: React.FC<GlassesHUDProps> = ({
  activeSpeaker,
  lastMessage,
  lastSender,
  aiSuggestion,
  voiceState,
  visible,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      {/* Top: active speaker */}
      <View style={styles.topRow}>
        {activeSpeaker ? (
          <View style={styles.speakerRow}>
            <View style={styles.liveDot} />
            <Text style={styles.speakerName} numberOfLines={1}>{activeSpeaker}</Text>
          </View>
        ) : (
          <Text style={styles.idleText}>Listening...</Text>
        )}
      </View>

      {/* Center: last message */}
      {lastMessage && (
        <View style={styles.messageCard}>
          {lastSender && (
            <Text style={styles.messageSender} numberOfLines={1}>{lastSender}</Text>
          )}
          <Text style={styles.messageText} numberOfLines={2}>{lastMessage}</Text>
        </View>
      )}

      {/* Bottom: AI suggestion + orb */}
      <View style={styles.bottomRow}>
        {aiSuggestion ? (
          <View style={styles.suggestionPill}>
            <Text style={styles.suggestionIcon}>{'✦'}</Text>
            <Text style={styles.suggestionText} numberOfLines={1}>{aiSuggestion}</Text>
          </View>
        ) : (
          <View />
        )}
        <AIOrb state={voiceState} size={28} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
    paddingBottom: 40,
  },
  topRow: {
    alignItems: 'center',
  },
  speakerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.voiceListening,
    marginRight: Spacing.sm,
  },
  speakerName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
  },
  idleText: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  messageCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignSelf: 'center',
    maxWidth: '90%',
  },
  messageSender: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 22,
    fontWeight: '500',
    color: Colors.white,
    lineHeight: 30,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  suggestionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.primary}30`,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    maxWidth: '75%',
  },
  suggestionIcon: {
    fontSize: 14,
    color: Colors.primary,
    marginRight: Spacing.sm,
  },
  suggestionText: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '500',
  },
});

export default GlassesHUD;
