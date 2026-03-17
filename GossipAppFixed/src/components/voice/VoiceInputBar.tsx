import React, { useState, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Colors, BorderRadius, Spacing } from '../../constants/theme';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useAudioPlayback } from '../../hooks/useAudioPlayback';
import WhisperPicker, { WhisperMember } from './WhisperPicker';

export interface VoiceInputBarRef {
  triggerStartRecording: () => Promise<void>;
  triggerStopAndSend: () => Promise<void>;
  getIsRecording: () => boolean;
}

interface VoiceInputBarProps {
  onSendMessage: (text: string) => void;
  onSendVoiceMessage?: (audioUri: string, durationMs: number, whisperTo?: string[]) => void;
  disabled?: boolean;
  groupName?: string;
  groupMembers?: WhisperMember[];
}

function formatRecordingTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const VoiceInputBar = forwardRef<VoiceInputBarRef, VoiceInputBarProps>(({
  onSendMessage,
  onSendVoiceMessage,
  disabled = false,
  groupMembers = [],
}, ref) => {
  const { isRecording, recordingDurationMs, startRecording, stopRecording, cancelRecording } = useAudioRecorder();
  const playback = useAudioPlayback();
  const [isTextMode, setIsTextMode] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [showWhisperPicker, setShowWhisperPicker] = useState(false);
  const [pendingWhisperTo, setPendingWhisperTo] = useState<string[] | undefined>(undefined);
  const [pendingRecording, setPendingRecording] = useState<{ uri: string; durationMs: number } | null>(null);

  // Track recording state in a ref so callbacks see the latest value
  const isRecordingRef = useRef(false);
  isRecordingRef.current = isRecording;

  // Expose imperative methods for parent (volume button integration)
  useImperativeHandle(ref, () => ({
    async triggerStartRecording() {
      if (isRecordingRef.current || disabled) return;
      try {
        await startRecording();
      } catch (err: any) {
        Alert.alert('Recording Error', err.message || 'Could not start recording');
      }
    },
    async triggerStopAndSend() {
      if (!isRecordingRef.current) return;
      try {
        const result = await stopRecording();
        if (result && onSendVoiceMessage) {
          onSendVoiceMessage(result.uri, result.durationMs, pendingWhisperTo);
        }
        setPendingRecording(null);
        setPendingWhisperTo(undefined);
      } catch (err: any) {
        Alert.alert('Recording Error', err.message || 'Could not stop recording');
      }
    },
    getIsRecording() {
      return isRecordingRef.current;
    },
  }));

  const handleTextSend = () => {
    if (!textInput.trim()) return;
    onSendMessage(textInput.trim());
    setTextInput('');
  };

  const handleStartRecording = async () => {
    try {
      await startRecording();
    } catch (err: any) {
      Alert.alert('Recording Error', err.message || 'Could not start recording');
    }
  };

  const handleStopAndReview = async () => {
    try {
      const result = await stopRecording();
      setPendingRecording({ uri: result.uri, durationMs: result.durationMs });
    } catch (err: any) {
      Alert.alert('Recording Error', err.message || 'Could not stop recording');
    }
  };

  const handleConfirmSend = () => {
    if (pendingRecording && onSendVoiceMessage) {
      playback.stop();
      onSendVoiceMessage(pendingRecording.uri, pendingRecording.durationMs, pendingWhisperTo);
    }
    setPendingRecording(null);
    setPendingWhisperTo(undefined);
  };

  const handleDiscardRecording = () => {
    playback.stop();
    setPendingRecording(null);
    setPendingWhisperTo(undefined);
  };

  const handleCancelRecording = async () => {
    await cancelRecording();
    setPendingWhisperTo(undefined);
  };

  const handleWhisperConfirm = async (selectedEmails: string[]) => {
    setShowWhisperPicker(false);
    setPendingWhisperTo(selectedEmails);
    // Start recording immediately after selecting recipients
    try {
      await startRecording();
    } catch (err: any) {
      Alert.alert('Recording Error', err.message || 'Could not start recording');
      setPendingWhisperTo(undefined);
    }
  };

  // ── Text mode ──────────────────────────────────────────────
  if (isTextMode) {
    return (
      <View style={styles.container}>
        <View style={styles.textInputRow}>
          <TouchableOpacity
            style={styles.modeToggle}
            onPress={() => setIsTextMode(false)}
          >
            <Text style={styles.modeToggleIcon}>&#x1F3A4;</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor={Colors.textMuted}
            value={textInput}
            onChangeText={setTextInput}
            multiline
            maxLength={1000}
            autoFocus
          />
          <TouchableOpacity
            style={[styles.sendButton, !textInput.trim() && styles.sendButtonDisabled]}
            onPress={handleTextSend}
            disabled={!textInput.trim() || disabled}
          >
            <Text style={styles.sendIcon}>&#x27A4;</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Recording mode ─────────────────────────────────────────
  if (isRecording) {
    return (
      <View style={styles.container}>
        <View style={styles.recordingRow}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancelRecording}>
            <Text style={styles.cancelIcon}>&#x2715;</Text>
          </TouchableOpacity>

          <View style={styles.recordingIndicator}>
            <View style={styles.redDot} />
            <Text style={styles.recordingTimer}>
              {formatRecordingTime(recordingDurationMs)}
            </Text>
            {pendingWhisperTo && (
              <Text style={styles.whisperBadge}>&#x1F512; Whisper</Text>
            )}
          </View>

          <TouchableOpacity style={styles.sendRecordingButton} onPress={handleStopAndReview}>
            <Text style={styles.sendRecordingIcon}>&#x23F9;</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Review mode (after recording, before sending) ─────────
  if (pendingRecording) {
    const isPreviewPlaying = playback.isPlaying && playback.currentUri === pendingRecording.uri;
    return (
      <View style={styles.container}>
        <View style={styles.reviewRow}>
          <TouchableOpacity style={styles.discardButton} onPress={handleDiscardRecording}>
            <Text style={styles.discardIcon}>{'\u{1F5D1}'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.previewPlayButton}
            onPress={() => playback.play(pendingRecording.uri, pendingRecording.durationMs)}
          >
            <Text style={styles.previewPlayIcon}>{isPreviewPlaying ? '\u23F8' : '\u25B6'}</Text>
          </TouchableOpacity>

          <View style={styles.reviewInfo}>
            <Text style={styles.reviewDuration}>
              {formatRecordingTime(pendingRecording.durationMs)}
            </Text>
            {pendingWhisperTo && (
              <Text style={styles.whisperBadge}>&#x1F512; Whisper</Text>
            )}
          </View>

          <TouchableOpacity style={styles.confirmSendButton} onPress={handleConfirmSend}>
            <Text style={styles.confirmSendIcon}>&#x27A4;</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Idle voice mode ────────────────────────────────────────
  return (
    <View style={styles.container}>
      <View style={styles.voiceRow}>
        <TouchableOpacity
          style={styles.keyboardToggle}
          onPress={() => setIsTextMode(true)}
        >
          <Text style={styles.keyboardIcon}>&#x2328;&#xFE0F;</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.micButton}
          onPress={handleStartRecording}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Text style={styles.micIcon}>&#x1F3A4;</Text>
          <Text style={styles.micLabel}>Tap or Vol Up to record</Text>
        </TouchableOpacity>

        {groupMembers.length > 0 && (
          <TouchableOpacity
            style={styles.whisperToggle}
            onPress={() => setShowWhisperPicker(true)}
            disabled={disabled}
          >
            <Text style={styles.whisperIcon}>&#x1F512;</Text>
          </TouchableOpacity>
        )}

        {groupMembers.length === 0 && <View style={styles.spacer} />}
      </View>

      <WhisperPicker
        visible={showWhisperPicker}
        members={groupMembers}
        onConfirm={handleWhisperConfirm}
        onCancel={() => setShowWhisperPicker(false)}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  // ── Voice idle ──
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  keyboardToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardIcon: {
    fontSize: 20,
  },
  micButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  micIcon: {
    fontSize: 32,
  },
  micLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  whisperToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whisperIcon: {
    fontSize: 18,
  },
  spacer: {
    width: 44,
  },
  // ── Recording ──
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  cancelButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelIcon: {
    fontSize: 18,
    color: Colors.danger,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.danger,
    marginRight: Spacing.sm,
  },
  recordingTimer: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  whisperBadge: {
    fontSize: 12,
    color: Colors.warning,
    fontWeight: '600',
    marginLeft: Spacing.md,
  },
  sendRecordingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendRecordingIcon: {
    fontSize: 20,
    color: Colors.white,
  },
  // ── Review mode ──
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  discardButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardIcon: {
    fontSize: 20,
    color: Colors.danger,
  },
  previewPlayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  previewPlayIcon: {
    fontSize: 18,
    color: Colors.primary,
  },
  reviewInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  reviewDuration: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  confirmSendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmSendIcon: {
    fontSize: 20,
    color: Colors.white,
  },
  // ── Text mode ──
  textInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  modeToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.voiceIdle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  modeToggleIcon: {
    fontSize: 20,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 18,
    color: Colors.textPrimary,
    maxHeight: 100,
    minHeight: 48,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surfaceLight,
  },
  sendIcon: {
    fontSize: 20,
    color: Colors.white,
  },
});

export default VoiceInputBar;
