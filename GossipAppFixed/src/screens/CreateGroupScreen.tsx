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
import { Colors, Spacing } from '../constants/theme';
import StarFieldBackground from '../components/futuristic/StarFieldBackground';
import GlassCard from '../components/futuristic/GlassCard';
import GlowingMicOrb from '../components/futuristic/GlowingMicOrb';
import GlowingIconButton from '../components/futuristic/GlowingIconButton';

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

  const orbState = voiceState === 'listening'
    ? 'listening'
    : voiceState === 'processing'
      ? 'processing'
      : 'idle';

  return (
    <StarFieldBackground starCount={20} showRadialGlow={false}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCancel} style={styles.backTouchable}>
              <GlowingIconButton icon={'\u2190'} size={38} onPress={handleCancel} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Group</Text>
            <View style={{ width: 38 }} />
          </View>

          {/* Voice input section */}
          <View style={styles.voiceSection}>
            <Text style={styles.voiceHint}>
              {voiceState === 'listening' ? 'Listening...' : 'Tap to say the group name'}
            </Text>
            <GlowingMicOrb
              state={orbState}
              size={80}
              onPress={handleVoicePress}
            />
          </View>

          {/* Form */}
          <GlassCard style={styles.formCard} intensity="medium">
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Group Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter group name"
                placeholderTextColor="rgba(148, 163, 184, 0.4)"
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
                placeholderTextColor="rgba(148, 163, 184, 0.4)"
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
                  <Text style={styles.privacyIcon}>{'\u{1F310}'}</Text>
                  <Text style={[styles.privacyText, privacy === 'public' && styles.privacyTextActive]}>
                    Public
                  </Text>
                  <Text style={styles.privacyDescription}>Anyone can join</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.privacyButton, privacy === 'private' && styles.privacyButtonActive]}
                  onPress={() => setPrivacy('private')}
                >
                  <Text style={styles.privacyIcon}>{'\u{1F512}'}</Text>
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
                placeholder="Add rules or terms for joining..."
                placeholderTextColor="rgba(148, 163, 184, 0.4)"
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
                {requireApproval && <Text style={styles.checkboxIcon}>{'\u2713'}</Text>}
              </View>
              <View style={styles.checkboxLabelContainer}>
                <Text style={styles.checkboxLabel}>Require approval for new members</Text>
                <Text style={styles.checkboxDescription}>
                  Admins/approvers must approve before members can join
                </Text>
              </View>
            </TouchableOpacity>
          </GlassCard>

          {/* Action buttons */}
          <View style={styles.actions}>
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
    </StarFieldBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
  },
  backTouchable: {
    // wrapper for GlowingIconButton
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#F1F5F9',
    letterSpacing: 0.5,
  },
  // ── Voice section ──
  voiceSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 16,
  },
  voiceHint: {
    fontSize: 15,
    color: 'rgba(226, 232, 240, 0.5)',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  // ── Form Card ──
  formCard: {
    marginHorizontal: 16,
    padding: 20,
  },
  inputContainer: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(226, 232, 240, 0.7)',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#F1F5F9',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  textArea: {
    height: 90,
    paddingTop: 14,
  },
  helperText: {
    fontSize: 12,
    color: 'rgba(148, 163, 184, 0.4)',
    marginTop: 4,
    fontStyle: 'italic',
  },
  // ── Privacy ──
  privacyContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  privacyButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    minHeight: 100,
  },
  privacyButtonActive: {
    borderColor: 'rgba(129, 140, 248, 0.4)',
    backgroundColor: 'rgba(129, 140, 248, 0.1)',
  },
  privacyIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  privacyText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(226, 232, 240, 0.7)',
    marginBottom: 2,
  },
  privacyTextActive: {
    color: '#818CF8',
  },
  privacyDescription: {
    fontSize: 12,
    color: 'rgba(148, 163, 184, 0.4)',
  },
  // ── Checkbox ──
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(148, 163, 184, 0.3)',
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: 'rgba(129, 140, 248, 0.3)',
    borderColor: '#818CF8',
  },
  checkboxIcon: {
    color: '#818CF8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabelContainer: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 2,
  },
  checkboxDescription: {
    fontSize: 13,
    color: 'rgba(148, 163, 184, 0.5)',
    lineHeight: 18,
  },
  // ── Actions ──
  actions: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  createButton: {
    backgroundColor: 'rgba(129, 140, 248, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.4)',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.5,
  },
  createButtonText: {
    color: '#818CF8',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  cancelButton: {
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  cancelButtonText: {
    color: 'rgba(226, 232, 240, 0.5)',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreateGroupScreen;
