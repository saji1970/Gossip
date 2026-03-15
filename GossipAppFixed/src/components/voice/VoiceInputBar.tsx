import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Colors, BorderRadius, Spacing } from '../../constants/theme';
import { useVoice } from '../../hooks/useVoice';
import VoiceButton from './VoiceButton';

interface VoiceInputBarProps {
  onSendMessage: (text: string) => void;
  onVoiceResult?: (text: string) => void;
  onAudioCaptured?: (audioUri: string) => void;
  disabled?: boolean;
  groupName?: string;
}

const VoiceInputBar: React.FC<VoiceInputBarProps> = ({
  onSendMessage,
  onVoiceResult,
  onAudioCaptured,
  disabled = false,
  groupName,
}) => {
  const { voiceState, isListening, startListening, stopListening, lastResult } = useVoice();
  const [isTextMode, setIsTextMode] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [lastProcessedTimestamp, setLastProcessedTimestamp] = useState(0);

  // Auto-send when voice result arrives
  useEffect(() => {
    if (lastResult && lastResult.timestamp > lastProcessedTimestamp) {
      setLastProcessedTimestamp(lastResult.timestamp);
      onVoiceResult?.(lastResult.text);
      onSendMessage(lastResult.text);
      if (lastResult.audioUri && onAudioCaptured) {
        onAudioCaptured(lastResult.audioUri);
      }
    }
  }, [lastResult]);

  const handleVoicePress = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleTextSend = () => {
    if (!textInput.trim()) return;
    onSendMessage(textInput.trim());
    setTextInput('');
  };

  const statusText =
    voiceState === 'listening' ? 'Listening...' :
    voiceState === 'processing' ? 'Processing...' :
    voiceState === 'error' ? 'Try again' :
    'Tap to speak';

  if (isTextMode) {
    return (
      <View style={styles.container}>
        <View style={styles.textInputRow}>
          <TouchableOpacity
            style={styles.modeToggle}
            onPress={() => setIsTextMode(false)}
          >
            <Text style={styles.modeToggleIcon}>🎤</Text>
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
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.voiceRow}>
        <TouchableOpacity
          style={styles.keyboardToggle}
          onPress={() => setIsTextMode(true)}
        >
          <Text style={styles.keyboardIcon}>⌨️</Text>
        </TouchableOpacity>

        <View style={styles.voiceCenter}>
          <VoiceButton
            voiceState={voiceState}
            onPress={handleVoicePress}
            size="large"
            disabled={disabled}
          />
          <Text style={[
            styles.statusText,
            voiceState === 'listening' && { color: Colors.voiceListening },
            voiceState === 'processing' && { color: Colors.voiceProcessing },
            voiceState === 'error' && { color: Colors.voiceError },
          ]}>
            {statusText}
          </Text>
        </View>

        {/* Spacer to balance the keyboard toggle */}
        <View style={styles.spacer} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  // Voice mode
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
  voiceCenter: {
    alignItems: 'center',
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    fontWeight: '500',
  },
  spacer: {
    width: 44,
  },
  // Text mode
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
