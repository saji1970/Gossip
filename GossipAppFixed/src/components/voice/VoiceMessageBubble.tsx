import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Spacing } from '../../constants/theme';

interface VoiceMessageBubbleProps {
  audioUri: string;
  durationMs: number;
  isOwnMessage: boolean;
  isWhisper: boolean;
  whisperToNames?: string[];
  // Playback state (from shared useAudioPlayback)
  isPlaying: boolean;
  isCurrentTrack: boolean;
  progress: number; // 0-1
  onPlay: () => void;
  timestamp: string;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const VoiceMessageBubble: React.FC<VoiceMessageBubbleProps> = ({
  durationMs,
  isOwnMessage,
  isWhisper,
  whisperToNames,
  isPlaying,
  isCurrentTrack,
  progress,
  onPlay,
  timestamp,
}) => {
  const bubbleColor = isOwnMessage ? Colors.ownBubble : Colors.otherBubble;
  const displayProgress = isCurrentTrack ? progress : 0;
  const playing = isCurrentTrack && isPlaying;

  return (
    <View style={[styles.bubble, { backgroundColor: bubbleColor }]}>
      {isWhisper && (
        <View style={styles.whisperLabel}>
          <Text style={styles.whisperIcon}>&#x1F512;</Text>
          <Text style={styles.whisperText}>
            Whisper{whisperToNames?.length ? ` to ${whisperToNames.join(', ')}` : ''}
          </Text>
        </View>
      )}

      <View style={styles.playerRow}>
        <TouchableOpacity style={styles.playButton} onPress={onPlay}>
          <Text style={styles.playIcon}>{playing ? '⏸' : '▶'}</Text>
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(displayProgress * 100, 100)}%` },
              ]}
            />
          </View>
        </View>

        <Text style={styles.duration}>{formatDuration(durationMs)}</Text>
      </View>

      <Text style={[
        styles.messageTime,
        isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime,
      ]}>
        {timestamp}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bubble: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xxl,
    minWidth: 200,
  },
  whisperLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  whisperIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  whisperText: {
    fontSize: 12,
    color: Colors.warning,
    fontWeight: '600',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  playIcon: {
    fontSize: 16,
    color: Colors.white,
  },
  progressContainer: {
    flex: 1,
    marginRight: Spacing.md,
    justifyContent: 'center',
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  duration: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
    minWidth: 36,
    textAlign: 'right',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  ownMessageTime: {
    color: Colors.textMuted,
  },
  otherMessageTime: {
    color: Colors.textMuted,
  },
});

export default VoiceMessageBubble;
