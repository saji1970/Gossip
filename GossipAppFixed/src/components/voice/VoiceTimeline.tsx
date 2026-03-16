import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, FlatList } from 'react-native';
import { Colors, BorderRadius, Spacing } from '../../constants/theme';
import SpeakerAura from './SpeakerAura';

export interface TimelineMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  isOwnMessage: boolean;
  type: 'text' | 'voice' | 'summary';
  audioUri?: string;
  audioDuration?: number;
  whisperTo?: string[];
  personalityBadge?: string;
  // Playback state
  isPlaying?: boolean;
  isCurrentTrack?: boolean;
  progress?: number;
}

interface VoiceTimelineProps {
  messages: TimelineMessage[];
  activeSpeakerId?: string;
  onPlayAudio: (audioUri: string, durationMs?: number) => void;
  onDeleteMessage?: (id: string) => void;
  onSuggestionPress?: (text: string) => void;
  glassesMode?: boolean;
  flatListRef?: React.RefObject<FlatList>;
}

const AVATAR_COLORS = ['#818CF8', '#34D399', '#FB923C', '#F87171', '#60A5FA', '#A78BFA', '#F472B6'];
const TRAIT_COLORS: Record<string, string> = {
  sarcastic: '#F59E0B', dramatic: '#EC4899', curious: '#3B82F6',
  supportive: '#10B981', secretive: '#8B5CF6', skeptical: '#F97316',
};

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

// Waveform bars component
const WaveformBars: React.FC<{ progress: number; isPlaying: boolean; color: string }> = ({
  progress, isPlaying, color,
}) => {
  const bars = 20;
  // Deterministic pseudo-random heights
  const heights = Array.from({ length: bars }, (_, i) => {
    const h = Math.sin(i * 0.8) * 0.4 + 0.5;
    return Math.max(0.15, Math.min(1, h));
  });

  return (
    <View style={waveStyles.container}>
      {heights.map((h, i) => {
        const filled = i / bars <= progress;
        return (
          <View
            key={i}
            style={[
              waveStyles.bar,
              {
                height: 24 * h,
                backgroundColor: filled ? color : `${color}33`,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const waveStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    flex: 1,
    gap: 2,
  },
  bar: {
    flex: 1,
    borderRadius: 1.5,
    minWidth: 3,
  },
});

// Summary card component
const SummaryCard: React.FC<{ content: string }> = ({ content }) => (
  <View style={summaryStyles.card}>
    <View style={summaryStyles.header}>
      <Text style={summaryStyles.icon}>{'✦'}</Text>
      <Text style={summaryStyles.title}>AI Summary</Text>
    </View>
    <Text style={summaryStyles.body}>{content}</Text>
  </View>
);

const summaryStyles = StyleSheet.create({
  card: {
    backgroundColor: `${Colors.primary}18`,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
    padding: Spacing.lg,
    marginVertical: Spacing.sm,
    marginHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  icon: {
    fontSize: 16,
    color: Colors.primary,
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textPrimary,
  },
});

// Single timeline item
const TimelineItem: React.FC<{
  message: TimelineMessage;
  isActiveSpeaker: boolean;
  onPlayAudio: (uri: string, dur?: number) => void;
  onDelete?: (id: string) => void;
  glassesMode: boolean;
}> = ({ message, isActiveSpeaker, onPlayAudio, onDelete, glassesMode }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, []);

  if (message.type === 'summary') {
    return <SummaryCard content={message.content} />;
  }

  const avatarColor = AVATAR_COLORS[message.senderName.length % AVATAR_COLORS.length];
  const playing = !!message.isCurrentTrack && !!message.isPlaying;
  const progress = message.isCurrentTrack ? (message.progress || 0) : 0;

  // Glasses HUD: ultra-minimal
  if (glassesMode) {
    return (
      <Animated.View style={[glassesItemStyles.row, { opacity: fadeAnim }]}>
        <View style={[glassesItemStyles.dot, { backgroundColor: avatarColor }]} />
        <Text style={glassesItemStyles.name} numberOfLines={1}>{message.senderName}</Text>
        <Text style={glassesItemStyles.content} numberOfLines={1}>
          {message.type === 'voice' ? `${formatDuration(message.audioDuration || 0)}` : message.content}
        </Text>
      </Animated.View>
    );
  }

  const isOwn = message.isOwnMessage;

  return (
    <Animated.View
      style={[
        styles.itemContainer,
        isOwn ? styles.ownItem : styles.otherItem,
        { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] },
      ]}
    >
      {/* Avatar (other messages only) */}
      {!isOwn && (
        <View style={styles.avatarColumn}>
          <SpeakerAura name={message.senderName} isActive={isActiveSpeaker} avatarColor={avatarColor} size={36} />
        </View>
      )}

      <View style={[styles.bubbleColumn, isOwn && styles.ownBubbleColumn]}>
        {/* Sender name + badge */}
        {!isOwn && (
          <View style={styles.senderRow}>
            <Text style={[styles.senderName, { color: avatarColor }]}>{message.senderName}</Text>
            {message.personalityBadge && (
              <View style={[styles.traitBadge, { backgroundColor: `${TRAIT_COLORS[message.personalityBadge] || Colors.primary}20` }]}>
                <Text style={[styles.traitText, { color: TRAIT_COLORS[message.personalityBadge] || Colors.primary }]}>
                  {message.personalityBadge}
                </Text>
              </View>
            )}
            <Text style={styles.timeText}>{formatTime(message.timestamp)}</Text>
          </View>
        )}

        {/* Whisper indicator */}
        {message.whisperTo && message.whisperTo.length > 0 && (
          <View style={styles.whisperRow}>
            <Text style={styles.whisperText}>{'\u{1F512}'} Whisper</Text>
          </View>
        )}

        {/* Voice message */}
        {message.type === 'voice' && message.audioUri ? (
          <TouchableOpacity
            style={[styles.voiceBubble, isOwn ? styles.ownVoiceBubble : styles.otherVoiceBubble]}
            onPress={() => onPlayAudio(message.audioUri!, message.audioDuration)}
            onLongPress={() => isOwn && onDelete?.(message.id)}
            activeOpacity={0.8}
          >
            <View style={styles.voicePlayRow}>
              <View style={[styles.playBtn, { backgroundColor: isOwn ? 'rgba(255,255,255,0.2)' : `${avatarColor}30` }]}>
                <Text style={[styles.playIcon, { color: isOwn ? Colors.white : avatarColor }]}>
                  {playing ? '\u23F8' : '\u25B6'}
                </Text>
              </View>

              <View style={styles.waveformArea}>
                <WaveformBars progress={progress} isPlaying={playing} color={isOwn ? Colors.white : avatarColor} />
              </View>

              <Text style={[styles.durationText, isOwn && styles.ownDurationText]}>
                {formatDuration(message.audioDuration || 0)}
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          /* Text message */
          <TouchableOpacity
            style={[styles.textBubble, isOwn ? styles.ownTextBubble : styles.otherTextBubble]}
            onLongPress={() => isOwn && onDelete?.(message.id)}
            activeOpacity={0.9}
          >
            <Text style={[styles.messageText, isOwn ? styles.ownMessageText : styles.otherMessageText]}>
              {message.content}
            </Text>
          </TouchableOpacity>
        )}

        {/* Timestamp for own messages */}
        {isOwn && (
          <Text style={styles.ownTimeText}>{formatTime(message.timestamp)}</Text>
        )}
      </View>
    </Animated.View>
  );
};

const glassesItemStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginRight: Spacing.sm,
    maxWidth: 80,
  },
  content: {
    fontSize: 16,
    color: Colors.textSecondary,
    flex: 1,
  },
});

// Main VoiceTimeline component
const VoiceTimeline: React.FC<VoiceTimelineProps> = ({
  messages,
  activeSpeakerId,
  onPlayAudio,
  onDeleteMessage,
  glassesMode = false,
  flatListRef,
}) => {
  const renderItem = ({ item }: { item: TimelineMessage }) => (
    <TimelineItem
      message={item}
      isActiveSpeaker={item.senderId === activeSpeakerId}
      onPlayAudio={onPlayAudio}
      onDelete={onDeleteMessage}
      glassesMode={glassesMode}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>{'\u{1F399}'}</Text>
      <Text style={styles.emptyTitle}>No messages yet</Text>
      <Text style={styles.emptySubtitle}>Start a conversation</Text>
    </View>
  );

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      renderItem={renderItem}
      keyExtractor={item => item.id}
      ListEmptyComponent={renderEmpty}
      contentContainerStyle={[styles.listContent, glassesMode && styles.glassesList]}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    flexGrow: 1,
  },
  glassesList: {
    paddingHorizontal: 0,
  },
  itemContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  ownItem: {
    justifyContent: 'flex-end',
  },
  otherItem: {
    justifyContent: 'flex-start',
  },
  avatarColumn: {
    width: 52,
    alignItems: 'center',
    paddingTop: 4,
  },
  bubbleColumn: {
    maxWidth: '78%',
    flexShrink: 1,
  },
  ownBubbleColumn: {
    alignItems: 'flex-end',
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  senderName: {
    fontSize: 13,
    fontWeight: '700',
  },
  traitBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  traitText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginLeft: 'auto',
  },
  ownTimeText: {
    fontSize: 11,
    color: Colors.textMuted,
    alignSelf: 'flex-end',
    marginTop: 3,
  },
  whisperRow: {
    marginBottom: 3,
  },
  whisperText: {
    fontSize: 11,
    color: Colors.warning,
    fontWeight: '600',
  },
  // Voice bubble
  voiceBubble: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    minWidth: 200,
  },
  ownVoiceBubble: {
    backgroundColor: Colors.ownBubble,
    borderBottomRightRadius: 6,
  },
  otherVoiceBubble: {
    backgroundColor: Colors.otherBubble,
    borderBottomLeftRadius: 6,
  },
  voicePlayRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  playIcon: {
    fontSize: 14,
  },
  waveformArea: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  durationText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
    minWidth: 32,
    textAlign: 'right',
  },
  ownDurationText: {
    color: 'rgba(255,255,255,0.6)',
  },
  // Text bubble
  textBubble: {
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  ownTextBubble: {
    backgroundColor: Colors.ownBubble,
    borderBottomRightRadius: 6,
  },
  otherTextBubble: {
    backgroundColor: Colors.otherBubble,
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownMessageText: {
    color: Colors.ownBubbleText,
  },
  otherMessageText: {
    color: Colors.otherBubbleText,
  },
  // Empty
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
});

export default VoiceTimeline;
