import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Group } from '../utils/GroupStorage';
import { useApp } from '../context/AppContext';
import { Colors, BorderRadius, Spacing } from '../constants/theme';
import VoiceInputBar, { VoiceInputBarRef } from '../components/voice/VoiceInputBar';
import VoiceCommandOverlay from '../components/voice/VoiceCommandOverlay';
import { useVolumeButtons } from '../hooks/useVolumeButtons';
import VoiceTimeline, { TimelineMessage } from '../components/voice/VoiceTimeline';
import PredictiveSuggestions from '../components/voice/PredictiveSuggestions';
import AIOrb, { OrbState } from '../components/voice/AIOrb';
import GlassesHUD from '../components/voice/GlassesHUD';
import GlassCard from '../components/futuristic/GlassCard';
import GlowingIconButton from '../components/futuristic/GlowingIconButton';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { useTTS } from '../hooks/useTTS';
import { useGlassesMode } from '../hooks/useGlassesMode';
import * as LastReadService from '../services/LastReadService';
import { WhisperMember } from '../components/voice/WhisperPicker';
import * as api from '../services/api';

interface ChatRoomScreenProps {
  navigation?: any;
  route?: any;
}

interface Message {
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
}

const messagesByGroup = new Map<string, Message[]>();

const ChatRoomScreen: React.FC<ChatRoomScreenProps> = ({ navigation, route }) => {
  const { user, getGroupById } = useApp();
  const groupId = route?.params?.group?.id;
  const [group, setGroup] = useState<Group | undefined>(route?.params?.group);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const playback = useAudioPlayback();
  const tts = useTTS();
  const { glassesMode, toggleGlassesMode } = useGlassesMode();
  const [voiceOverlayVisible, setVoiceOverlayVisible] = useState(false);
  const voiceInputRef = useRef<VoiceInputBarRef>(null);

  // ── Volume button handlers ──
  const handleVolDownLongPress = useCallback(() => {
    setVoiceOverlayVisible(prev => !prev);
  }, []);

  const handleVolUpLongPress = useCallback(async () => {
    if (!voiceInputRef.current) return;
    if (voiceInputRef.current.getIsRecording()) {
      await voiceInputRef.current.triggerStopAndSend();
    } else {
      await voiceInputRef.current.triggerStartRecording();
    }
  }, []);

  useVolumeButtons({
    onVolumeDownLongPress: handleVolDownLongPress,
    onVolumeUpLongPress: handleVolUpLongPress,
    enabled: true,
  });

  // AI state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | undefined>();
  const [ambientMode, setAmbientMode] = useState(false);

  useEffect(() => {
    if (groupId) {
      const currentGroup = getGroupById(groupId);
      if (currentGroup) setGroup(currentGroup);
      loadMessages();
    }
  }, [groupId]);

  useEffect(() => {
    if (groupId && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const ts = lastMsg.timestamp instanceof Date
        ? lastMsg.timestamp.getTime()
        : new Date(lastMsg.timestamp).getTime();
      LastReadService.setLastReadTimestamp(groupId, ts);
    }
  }, [groupId, messages.length]);

  // Fetch AI suggestions when a new non-own message arrives
  useEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (!last.isOwnMessage && last.type !== 'summary') {
      fetchSuggestions(last.content);
    }
  }, [messages.length]);

  const fetchSuggestions = useCallback(async (text: string) => {
    setSuggestionsLoading(true);
    setOrbState('processing');
    try {
      const result = await api.getReplySuggestions(text, 'neutral', 'general', {}, 3);
      setSuggestions(result);
      setOrbState('responding');
      setTimeout(() => {
        setSuggestions(prev => prev === result ? [] : prev);
        setOrbState(prev => prev === 'responding' ? 'idle' : prev);
      }, 15000);
    } catch {
      setSuggestions([
        'Got it, thanks!',
        'Tell me more',
        'Interesting!',
      ]);
      setOrbState('idle');
    }
    setSuggestionsLoading(false);
  }, []);

  const loadMessages = () => {
    if (groupId) {
      const groupMessages = messagesByGroup.get(groupId) || [];
      setMessages(groupMessages);
    }
  };

  const addMessage = useCallback((msg: Message) => {
    if (!groupId) return;
    const groupMessages = messagesByGroup.get(groupId) || [];
    groupMessages.push(msg);
    messagesByGroup.set(groupId, groupMessages);
    setMessages([...groupMessages]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [groupId]);

  const handleSendMessage = useCallback((text: string) => {
    if (!text.trim() || !groupId || sending) return;
    setSending(true);

    const userName = user?.displayName || 'You';
    const userEmail = user?.email || 'user@example.com';

    const message: Message = {
      id: Date.now().toString(),
      senderId: userEmail,
      senderName: userName,
      content: text.trim(),
      timestamp: new Date(),
      isOwnMessage: true,
      type: 'text',
    };

    addMessage(message);
    setSending(false);
    setSuggestions([]);
    setOrbState('idle');

    api.sendMessage(groupId, userName, text.trim()).catch(() => {});
  }, [groupId, sending, user, addMessage]);

  const handleSendVoiceMessage = useCallback((audioUri: string, durationMs: number, whisperTo?: string[]) => {
    if (!groupId) return;
    const userName = user?.displayName || 'You';
    const userEmail = user?.email || 'user@example.com';

    const message: Message = {
      id: Date.now().toString(),
      senderId: userEmail,
      senderName: userName,
      content: '[Voice message]',
      timestamp: new Date(),
      isOwnMessage: true,
      type: 'voice',
      audioUri,
      audioDuration: durationMs,
      whisperTo: whisperTo && whisperTo.length > 0 ? whisperTo : undefined,
    };

    addMessage(message);
    api.sendVoiceMessage(groupId, audioUri, durationMs, userName, whisperTo).catch(() => {});
  }, [groupId, user, addMessage]);

  const handleDeleteMessage = useCallback((messageId: string) => {
    Alert.alert('Delete message', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => {
          if (!groupId) return;
          const updated = (messagesByGroup.get(groupId) || []).filter(m => m.id !== messageId);
          messagesByGroup.set(groupId, updated);
          setMessages([...updated]);
          api.deleteMessage(messageId).catch(() => {});
        },
      },
    ]);
  }, [groupId]);

  const handleSuggestionSelect = useCallback((text: string, _index: number) => {
    handleSendMessage(text);
  }, [handleSendMessage]);

  const handleSummarize = useCallback(async () => {
    if (!groupId) return;
    setOrbState('processing');
    try {
      const result = await api.getConversationSummary(groupId);
      const summaryMsg: Message = {
        id: `summary-${Date.now()}`,
        senderId: 'ai',
        senderName: 'AI',
        content: result.summary,
        timestamp: new Date(),
        isOwnMessage: false,
        type: 'summary',
      };
      addMessage(summaryMsg);
      setOrbState('responding');
      setTimeout(() => setOrbState('idle'), 3000);
    } catch {
      Alert.alert('Error', 'Could not generate summary');
      setOrbState('idle');
    }
  }, [groupId, addMessage]);

  const handleStartCall = (type: 'voice' | 'video') => {
    Alert.alert(
      `${type === 'voice' ? 'Voice' : 'Video'} Call`,
      `Start a group ${type} call?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start Call', onPress: () => navigation?.navigate('GroupCall', { group, callType: type }) },
      ]
    );
  };

  const whisperMembers: WhisperMember[] = (group?.members || [])
    .filter(m => m.status === 'approved' && m.email !== user?.email)
    .map(m => ({ email: m.email }));

  const visibleMessages = messages.filter((msg) => {
    if (!msg.whisperTo || msg.whisperTo.length === 0) return true;
    const currentEmail = user?.email || '';
    return msg.isOwnMessage || msg.whisperTo.includes(currentEmail);
  });

  // Convert to timeline messages
  const timelineMessages: TimelineMessage[] = visibleMessages.map(m => ({
    ...m,
    isCurrentTrack: playback.currentUri === m.audioUri,
    isPlaying: playback.isPlaying && playback.currentUri === m.audioUri,
    progress: playback.currentUri === m.audioUri ? playback.progress : 0,
  }));

  // Filter to only text/voice messages for TTS (exclude 'summary')
  const speakableMessages = visibleMessages.filter(m => m.type === 'text' || m.type === 'voice') as Array<{
    senderName: string; content: string; isOwnMessage: boolean; type: 'text' | 'voice'; timestamp: Date;
  }>;

  const handleVoiceCommand = (type: string, payload: string) => {
    switch (type) {
      case 'read_latest':
        tts.speakLatest(speakableMessages);
        break;
      case 'read_unread':
        if (groupId) tts.speakUnread(groupId, speakableMessages);
        break;
      case 'send_message':
        if (payload) handleSendMessage(payload);
        break;
      case 'call_group':
        handleStartCall('voice');
        break;
      case 'select_suggestion': {
        const idx = parseInt(payload, 10) - 1;
        if (idx >= 0 && idx < suggestions.length) {
          handleSendMessage(suggestions[idx]);
        }
        break;
      }
      case 'summarize':
        handleSummarize();
        break;
      case 'start_ambient':
        setAmbientMode(true);
        setOrbState('listening');
        break;
      case 'stop_ambient':
        setAmbientMode(false);
        setOrbState('idle');
        break;
      default:
        break;
    }
  };

  const handlePlayAudio = useCallback((uri: string, dur?: number) => {
    playback.play(uri, dur);
    const msg = messages.find(m => m.audioUri === uri);
    if (msg) {
      setActiveSpeakerId(msg.senderId);
      setTimeout(() => setActiveSpeakerId(undefined), (dur || 3000));
    }
  }, [playback, messages]);

  const handleReadAloudPress = () => {
    if (tts.isSpeaking) {
      tts.stop();
    } else {
      tts.speakLatest(speakableMessages);
    }
  };

  const lastVisible = visibleMessages[visibleMessages.length - 1];

  if (!group) {
    return (
      <View style={styles.container}>
        <Text style={styles.noGroupText}>No group selected</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>

        {/* Glassmorphism Header */}
        <View style={styles.groupHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('ChatList')}>
            <Text style={styles.backButtonText}>{'\u2190'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.groupInfo} onPress={() => setShowMembers(!showMembers)} activeOpacity={0.7}>
            <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
            <View style={styles.groupSubRow}>
              <Text style={styles.groupMembers}>
                {group.members?.filter(m => m.status === 'approved').length || 1} members
              </Text>
              {ambientMode && (
                <View style={styles.ambientBadge}>
                  <View style={styles.ambientDot} />
                  <Text style={styles.ambientText}>Ambient</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* AI Orb */}
          <View style={styles.orbContainer}>
            <AIOrb state={orbState} size={32} />
          </View>

          <GlowingIconButton
            icon={tts.isSpeaking ? '\u23F9' : '\u{1F50A}'}
            onPress={handleReadAloudPress}
            size={34}
          />
          <GlowingIconButton
            icon={'\u{1F3A4}'}
            onPress={() => setVoiceOverlayVisible(true)}
            size={34}
          />
          <GlowingIconButton
            icon={'\u{1F453}'}
            onPress={toggleGlassesMode}
            size={34}
            active={glassesMode}
            glowColor="rgba(129, 140, 248, 0.4)"
          />
          <GlowingIconButton
            icon={'\u{1F4DE}'}
            onPress={() => handleStartCall('voice')}
            size={34}
          />
        </View>

        {/* Members Panel */}
        {showMembers && group.members && (
          <GlassCard style={styles.membersPanel} intensity="high">
            {group.members.filter(m => m.status === 'approved').map((member) => {
              const isCurrentUser = member.email === user?.email;
              const roleColors: Record<string, string> = { admin: '#F59E0B', approver: '#818CF8', member: 'rgba(148, 163, 184, 0.5)' };
              return (
                <View key={member.email} style={styles.memberRow}>
                  <View style={[styles.memberAvatar, { borderColor: isCurrentUser ? '#34D399' : '#818CF8' }]}>
                    <Text style={styles.memberAvatarText}>{member.email.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.memberDetails}>
                    <Text style={styles.memberEmail} numberOfLines={1}>
                      {member.email}{isCurrentUser ? ' (You)' : ''}
                    </Text>
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: `${roleColors[member.role] || 'rgba(148,163,184,0.5)'}30` }]}>
                    <Text style={[styles.roleBadgeText, { color: roleColors[member.role] || '#94A3B8' }]}>{member.role}</Text>
                  </View>
                </View>
              );
            })}
          </GlassCard>
        )}

        {/* Voice Timeline */}
        <VoiceTimeline
          messages={timelineMessages}
          activeSpeakerId={activeSpeakerId}
          onPlayAudio={handlePlayAudio}
          onDeleteMessage={handleDeleteMessage}
          glassesMode={glassesMode}
          flatListRef={flatListRef}
        />

        {/* Predictive Suggestions */}
        <PredictiveSuggestions
          suggestions={suggestions}
          onSelect={handleSuggestionSelect}
          visible={suggestions.length > 0 || suggestionsLoading}
          loading={suggestionsLoading}
        />

        {/* Voice Input Bar */}
        <VoiceInputBar
          ref={voiceInputRef}
          onSendMessage={handleSendMessage}
          onSendVoiceMessage={handleSendVoiceMessage}
          disabled={sending}
          groupName={group.name}
          groupMembers={whisperMembers}
        />
      </KeyboardAvoidingView>

      {/* Voice Command Overlay */}
      <VoiceCommandOverlay
        visible={voiceOverlayVisible}
        onDismiss={() => setVoiceOverlayVisible(false)}
        onCommand={handleVoiceCommand}
        context="chat_room"
        currentScreen="ChatRoom"
        currentGroup={group}
      />

      {/* Glasses HUD Overlay */}
      <GlassesHUD
        activeSpeaker={activeSpeakerId ? messages.find(m => m.senderId === activeSpeakerId)?.senderName : undefined}
        lastMessage={lastVisible?.type === 'voice' ? '[Voice]' : lastVisible?.content}
        lastSender={lastVisible?.isOwnMessage ? undefined : lastVisible?.senderName}
        aiSuggestion={suggestions[0]}
        voiceState={orbState}
        visible={glassesMode}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  keyboardView: {
    flex: 1,
  },
  noGroupText: {
    color: '#F1F5F9',
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
  },
  // ── Glassmorphism Header ──
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: 'rgba(2, 6, 23, 0.75)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.08)',
    paddingTop: 50,
    gap: 4,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  backButtonText: {
    color: '#F1F5F9',
    fontSize: 20,
    fontWeight: '600',
  },
  groupInfo: {
    flex: 1,
    marginLeft: 6,
  },
  groupName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  groupSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupMembers: {
    fontSize: 12,
    color: 'rgba(148, 163, 184, 0.5)',
  },
  ambientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  ambientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
    marginRight: 4,
  },
  ambientText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#34D399',
  },
  orbContainer: {
    marginRight: 2,
  },
  // ── Members Panel ──
  membersPanel: {
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 16,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  memberAvatarText: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '600',
  },
  memberDetails: {
    flex: 1,
  },
  memberEmail: {
    fontSize: 14,
    color: '#F1F5F9',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});

export default ChatRoomScreen;
