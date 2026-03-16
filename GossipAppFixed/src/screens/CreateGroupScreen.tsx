import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
} from '@react-native-voice/voice';
import { useApp } from '../context/AppContext';
import { Group } from '../utils/GroupStorage';
import { Colors, BorderRadius, Spacing } from '../constants/theme';

interface CreateGroupScreenProps {
  navigation?: any;
  route?: { params?: { groupName?: string; privacy?: 'public' | 'private'; requireApproval?: boolean } };
}

type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

const CreateGroupScreen: React.FC<CreateGroupScreenProps> = ({ navigation, route }) => {
  const { user, groups, addGroup } = useApp();
  const [groupName, setGroupName] = useState(route?.params?.groupName || '');
  const [groupDescription, setGroupDescription] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>(route?.params?.privacy || 'public');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [requireApproval, setRequireApproval] = useState(route?.params?.requireApproval ?? false);
  const [loading, setLoading] = useState(false);

  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation while listening
  useEffect(() => {
    if (voiceState === 'listening') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.4, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [voiceState]);

  // Wire up Voice callbacks
  useEffect(() => {
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      const text = e.value?.[0] || '';
      if (text) setGroupName(text);
      setVoiceState('idle');
    };

    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      const text = e.value?.[0] || '';
      if (text) setGroupName(text);
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      setVoiceState('error');
      setTimeout(() => setVoiceState('idle'), 2000);
    };

    Voice.onSpeechEnd = () => {
      setVoiceState((prev) => (prev === 'listening' ? 'processing' : prev));
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const handleVoicePress = useCallback(async () => {
    if (voiceState === 'listening') {
      try { await Voice.stop(); } catch {}
      setVoiceState('idle');
    } else {
      try {
        setVoiceState('listening');
        await Voice.start('en-US');
      } catch (err: any) {
        Alert.alert('Voice Error', err.message || 'Could not start speech recognition');
        setVoiceState('error');
        setTimeout(() => setVoiceState('idle'), 2000);
      }
    }
  }, [voiceState]);

  const handleCreateGroup = () => {
    const trimmedName = groupName.trim();

    if (!trimmedName) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    // Check for duplicate group name locally
    const duplicate = groups.some(
      g => g.name.toLowerCase() === trimmedName.toLowerCase(),
    );
    if (duplicate) {
      Alert.alert('Duplicate Name', `A group named "${trimmedName}" already exists. Please choose a different name.`);
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const userEmail = user?.email || 'user@example.com';

      const newGroup: Group = {
        id: Date.now().toString(),
        name: trimmedName,
        description: groupDescription.trim(),
        privacy: privacy,
        termsAndConditions: termsAndConditions.trim() || undefined,
        requireApproval: requireApproval,
        members: [{
          email: userEmail,
          role: 'admin',
          status: 'approved',
          joinedAt: new Date().toISOString(),
        }],
        createdBy: userEmail,
        lastMessage: 'Group created',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        unreadCount: 0,
        createdAt: new Date().toISOString(),
      };

      addGroup(newGroup);

      setLoading(false);
      Alert.alert(
        'Success',
        `${privacy === 'private' ? 'Private' : 'Public'} group "${trimmedName}" created successfully!`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (navigation) {
                navigation.navigate('ChatList', { refresh: Date.now() });
              }
            },
          },
        ]
      );
    }, 500);
  };

  const handleCancel = () => {
    if (navigation) {
      navigation.navigate('ChatList');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.backTouchable}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Group</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Voice input for group name */}
          <View style={styles.voiceSection}>
            <Text style={styles.voiceHint}>
              {voiceState === 'listening' ? 'Listening...' : 'Tap to say the group name'}
            </Text>
            <Animated.View style={{ transform: [{ scale: voiceState === 'listening' ? pulseAnim : 1 }] }}>
              <TouchableOpacity
                style={[
                  styles.voiceMicButton,
                  voiceState === 'listening' && styles.voiceMicListening,
                  voiceState === 'error' && styles.voiceMicError,
                ]}
                onPress={handleVoicePress}
                activeOpacity={0.7}
              >
                <Text style={styles.voiceMicIcon}>
                  {voiceState === 'listening' ? '\u{1F3D9}' : '\u{1F3A4}'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Group Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter group name"
              placeholderTextColor={Colors.textMuted}
              value={groupName}
              onChangeText={setGroupName}
              autoCapitalize="words"
              maxLength={50}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What's this group about?"
              placeholderTextColor={Colors.textMuted}
              value={groupDescription}
              onChangeText={setGroupDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={200}
            />
          </View>

          {/* Privacy Selection */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Group Privacy</Text>
            <View style={styles.privacyContainer}>
              <TouchableOpacity
                style={[styles.privacyButton, privacy === 'public' && styles.privacyButtonActive]}
                onPress={() => setPrivacy('public')}
              >
                <Text style={styles.privacyIcon}>🌐</Text>
                <Text style={[styles.privacyText, privacy === 'public' && styles.privacyTextActive]}>
                  Public
                </Text>
                <Text style={styles.privacyDescription}>Anyone can join</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.privacyButton, privacy === 'private' && styles.privacyButtonActive]}
                onPress={() => setPrivacy('private')}
              >
                <Text style={styles.privacyIcon}>🔒</Text>
                <Text style={[styles.privacyText, privacy === 'private' && styles.privacyTextActive]}>
                  Private
                </Text>
                <Text style={styles.privacyDescription}>Invite only</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Terms and Conditions */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Terms & Conditions (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add rules or terms for joining this group..."
              placeholderTextColor={Colors.textMuted}
              value={termsAndConditions}
              onChangeText={setTermsAndConditions}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.helperText}>
              New members will see agree/disagree before joining
            </Text>
          </View>

          {/* Approval Requirement */}
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setRequireApproval(!requireApproval)}
          >
            <View style={[styles.checkbox, requireApproval && styles.checkboxChecked]}>
              {requireApproval && <Text style={styles.checkboxIcon}>✓</Text>}
            </View>
            <View style={styles.checkboxLabelContainer}>
              <Text style={styles.checkboxLabel}>Require approval for new members</Text>
              <Text style={styles.checkboxDescription}>
                Admins/approvers must approve before members can join
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.createButton, loading && styles.disabledButton]}
            onPress={handleCreateGroup}
            disabled={loading}
          >
            <Text style={styles.createButtonText}>
              {loading ? 'Creating...' : 'Create Group'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: 50,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backTouchable: {
    paddingVertical: Spacing.sm,
  },
  backButton: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  form: {
    padding: Spacing.xl,
  },
  // Voice section
  voiceSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
    paddingVertical: Spacing.lg,
  },
  voiceHint: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  voiceMicButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.voiceIdle,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  voiceMicListening: {
    backgroundColor: Colors.primary,
  },
  voiceMicError: {
    backgroundColor: Colors.danger,
  },
  voiceMicIcon: {
    fontSize: 32,
  },
  inputContainer: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 16,
    fontSize: 18,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  textArea: {
    height: 100,
    paddingTop: 16,
  },
  helperText: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  privacyContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  privacyButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    minHeight: 110,
  },
  privacyButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceLight,
  },
  privacyIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  privacyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  privacyTextActive: {
    color: Colors.primary,
  },
  privacyDescription: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 6,
    marginRight: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxIcon: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabelContainer: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  checkboxDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  createButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 20,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  disabledButton: {
    backgroundColor: Colors.textMuted,
  },
  createButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    paddingVertical: 20,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 18,
    fontWeight: '600',
  },
});

export default CreateGroupScreen;
