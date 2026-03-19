import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Group } from '../utils/GroupStorage';
import { useApp } from '../context/AppContext';
import { Colors } from '../constants/theme';
import VoiceCommandOverlay from '../components/voice/VoiceCommandOverlay';
import { useVolumeButtons } from '../hooks/useVolumeButtons';
import { useVoice } from '../hooks/useVoice';
import GlassCard from '../components/futuristic/GlassCard';
import GlowingMicOrb from '../components/futuristic/GlowingMicOrb';
import GlowingIconButton from '../components/futuristic/GlowingIconButton';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { useTTS } from '../hooks/useTTS';
import * as LastReadService from '../services/LastReadService';
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
}

const messagesByGroup = new Map<string, Message[]>();

const AVATAR_COLORS = ['#818CF8', '#34D399', '#FB923C', '#F87171', '#60A5FA', '#A78BFA', '#F472B6'];

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

const ChatRoomScreen: React.FC<ChatRoomScreenProps> = ({ navigation, route }) => {
  const { user, getGroupById } = useApp();
  const groupId = route?.params?.group?.id;
  const [group, setGroup] = useState<Group | undefined>(route?.params?.group);
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const lastProcessedResult = useRef<string | null>(null);

  const playback = useAudioPlayback();
  const tts = useTTS();
  const { voiceState, startListening, stopListening, lastResult } = useVoice();
  const [voiceOverlayVisible, setVoiceOverlayVisible] = useState(false);
  const [ambientMode, setAmbientMode] = useState(false);

  // ── Volume button handlers ──
  const handleVolDownLongPress = useCallback(() => {
    setVoiceOverlayVisible(prev => !prev);
  }, []);

  const handleVolUpLongPress = useCallback(() => {
    if (voiceState === 'listening') {
      stopListening();
    } else {
      startListening();
    }
  }, [voiceState, startListening, stopListening]);

  useVolumeButtons({
    onVolumeDownLongPress: handleVolDownLongPress,
    onVolumeUpLongPress: handleVolUpLongPress,
    enabled: true,
  });

  // AI suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);

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

  // Handle voice STT results
  useEffect(() => {
    if (lastResult && lastResult.text && lastResult.text !== lastProcessedResult.current) {
      lastProcessedResult.current = lastResult.text;
      handleSendMessage(lastResult.text);
    }
  }, [lastResult]);

  const fetchSuggestions = useCallback(async (text: string) => {
    try {
      const result = await api.getReplySuggestions(text, 'neutral', 'general', {}, 3);
      setSuggestions(result);
      setTimeout(() => {
        setSuggestions(prev => prev === result ? [] : prev);
      }, 15000);
    } catch {
      setSuggestions([
        'Got it, thanks!',
        'Tell me more',
        'Interesting!',
      ]);
    }
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

    api.sendMessage(groupId, userName, text.trim()).catch(() => {});
  }, [groupId, sending, user, addMessage]);

  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    Keyboard.dismiss();
    handleSendMessage(textInput);
    setTextInput('');
  };

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

  const handleSuggestionSelect = useCallback((text: string) => {
    handleSendMessage(text);
  }, [handleSendMessage]);

  const handleSummarize = useCallback(async () => {
    if (!groupId) return;
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
    } catch {
      Alert.alert('Error', 'Could not generate summary');
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

  const visibleMessages = messages.filter((msg) => {
    if (!msg.whisperTo || msg.whisperTo.length === 0) return true;
    const currentEmail = user?.email || '';
    return msg.isOwnMessage || msg.whisperTo.includes(currentEmail);
  });

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
        break;
      case 'stop_ambient':
        setAmbientMode(false);
        break;
      default:
        break;
    }
  };

  const handlePlayAudio = useCallback((uri: string, dur?: number) => {
    playback.play(uri, dur);
  }, [playback]);

  const handleReadAloudPress = () => {
    if (tts.isSpeaking) {
      tts.stop();
    } else {
      tts.speakLatest(speakableMessages);
    }
  };

  const handleOrbPress = () => {
    if (voiceState === 'listening') {
      stopListening();
    } else {
      startListening();
    }
  };

  const orbDisplayState = voiceState === 'listening'
    ? 'listening'
    : voiceState === 'processing'
      ? 'processing'
      : 'idle';

  // ── Render message bubble (matching MainTabsScreen style) ──
  const renderMessage = ({ item }: { item: Message }) => {
    // Summary card
    if (item.type === 'summary') {
      return (
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryIcon}>{'\u2728'}</Text>
            <Text style={styles.summaryTitle}>AI Summary</Text>
          </View>
          <Text style={styles.summaryBody}>{item.content}</Text>
        </View>
      );
    }

    // Own message (right side, purple)
    if (item.isOwnMessage) {
      return (
        <View style={styles.userRow}>
          <TouchableOpacity
            style={styles.userBubble}
            onLongPress={() => handleDeleteMessage(item.id)}
            activeOpacity={0.9}
          >
            {item.type === 'voice' && item.audioUri ? (
              <TouchableOpacity onPress={() => handlePlayAudio(item.audioUri!, item.audioDuration)} activeOpacity={0.7}>
                <View style={styles.voiceRow}>
                  <Text style={styles.voicePlayIcon}>
                    {playback.isPlaying && playback.currentUri === item.audioUri ? '\u23F8' : '\u25B6'}
                  </Text>
                  <View style={styles.voiceWaveArea}>
                    {Array.from({ length: 16 }, (_, i) => {
                      const h = Math.sin(i * 0.8) * 0.4 + 0.5;
                      const progress = playback.currentUri === item.audioUri ? playback.progress : 0;
                      const filled = i / 16 <= progress;
                      return (
                        <View key={i} style={[styles.waveBar, { height: 20 * h, backgroundColor: filled ? '#E0E7FF' : 'rgba(224,231,255,0.3)' }]} />
                      );
                    })}
                  </View>
                  <Text style={styles.voiceDurationOwn}>{formatDuration(item.audioDuration || 0)}</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <Text style={styles.userBubbleText}>{item.content}</Text>
            )}
            {item.whisperTo && item.whisperTo.length > 0 && (
              <Text style={styles.whisperBadge}>{'\u{1F512}'} Whisper</Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    // Other person's message (left side, with sender name label + purple left border)
    const avatarColor = AVATAR_COLORS[item.senderName.length % AVATAR_COLORS.length];
    const displayName = item.senderName.split('@')[0];

    return (
      <View style={styles.otherRow}>
        <View style={styles.otherBubble}>
          <Text style={[styles.senderLabel, { color: avatarColor }]}>{displayName}</Text>
          {item.type === 'voice' && item.audioUri ? (
            <TouchableOpacity onPress={() => handlePlayAudio(item.audioUri!, item.audioDuration)} activeOpacity={0.7}>
              <View style={styles.voiceRow}>
                <Text style={[styles.voicePlayIcon, { color: avatarColor }]}>
                  {playback.isPlaying && playback.currentUri === item.audioUri ? '\u23F8' : '\u25B6'}
                </Text>
                <View style={styles.voiceWaveArea}>
                  {Array.from({ length: 16 }, (_, i) => {
                    const h = Math.sin(i * 0.8) * 0.4 + 0.5;
                    const progress = playback.currentUri === item.audioUri ? playback.progress : 0;
                    const filled = i / 16 <= progress;
                    return (
                      <View key={i} style={[styles.waveBar, { height: 20 * h, backgroundColor: filled ? avatarColor : `${avatarColor}33` }]} />
                    );
                  })}
                </View>
                <Text style={styles.voiceDuration}>{formatDuration(item.audioDuration || 0)}</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <Text style={styles.otherBubbleText}>{item.content}</Text>
          )}
          {item.whisperTo && item.whisperTo.length > 0 && (
            <Text style={styles.whisperBadge}>{'\u{1F512}'} Whisper</Text>
          )}
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>{'\u{1F399}'}</Text>
      <Text style={styles.emptyTitle}>No messages yet</Text>
      <Text style={styles.emptySubtitle}>Tap the mic or type to start chatting</Text>
    </View>
  );

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

        {/* ── Header ── */}
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

          <GlowingIconButton
            icon={tts.isSpeaking ? '\u23F9' : '\u{1F50A}'}
            onPress={handleReadAloudPress}
            size={34}
          />
          <GlowingIconButton
            icon={'\u{1F4DE}'}
            onPress={() => handleStartCall('voice')}
            size={34}
          />
        </View>

        {/* ── Members Panel ── */}
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

        {/* ── Message List (same style as MainTabsScreen) ── */}
        <FlatList
          ref={flatListRef}
          data={visibleMessages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmpty}
          style={styles.chatList}
          contentContainerStyle={styles.chatListContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        />

        {/* ── Suggestion Pills ── */}
        {suggestions.length > 0 && (
          <View style={styles.suggestionsRow}>
            {suggestions.map((s, i) => (
              <TouchableOpacity
                key={i}
                style={styles.suggestionPill}
                onPress={() => handleSuggestionSelect(s)}
                activeOpacity={0.7}
              >
                <Text style={styles.suggestionPillText} numberOfLines={1}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Mic Orb ── */}
        <View style={styles.orbArea}>
          <GlowingMicOrb
            state={orbDisplayState}
            size={80}
            onPress={handleOrbPress}
          />
          <Text style={styles.orbLabel}>
            {voiceState === 'listening' ? 'Listening...' : 'Tap to talk'}
          </Text>
        </View>

        {/* ── Text Input ── */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor="rgba(148, 163, 184, 0.4)"
            value={textInput}
            onChangeText={setTextInput}
            onSubmitEditing={handleTextSubmit}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, !textInput.trim() && styles.sendBtnDisabled]}
            onPress={handleTextSubmit}
            disabled={!textInput.trim()}
            activeOpacity={0.7}
          >
            <Text style={styles.sendBtnText}>{'\u2192'}</Text>
          </TouchableOpacity>
        </View>
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
  // ── Header ──
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: 'rgba(2, 6, 23, 0.75)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.08)',
    paddingTop: 50,
    gap: 6,
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
  // ── Chat List ──
  chatList: {
    flex: 1,
  },
  chatListContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexGrow: 1,
  },
  // ── Message Bubbles (matching MainTabsScreen) ──
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  userBubble: {
    backgroundColor: '#312E81',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '78%',
  },
  userBubbleText: {
    color: '#E0E7FF',
    fontSize: 15,
    lineHeight: 21,
  },
  otherRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  otherBubble: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '85%',
    borderLeftWidth: 3,
    borderLeftColor: '#818CF8',
  },
  senderLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  otherBubbleText: {
    color: '#E2E8F0',
    fontSize: 15,
    lineHeight: 21,
  },
  // ── Voice message inline ──
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  voicePlayIcon: {
    fontSize: 16,
    color: '#E0E7FF',
  },
  voiceWaveArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    height: 24,
    gap: 2,
  },
  waveBar: {
    flex: 1,
    borderRadius: 1.5,
    minWidth: 3,
  },
  voiceDuration: {
    fontSize: 12,
    color: 'rgba(226, 232, 240, 0.6)',
    minWidth: 32,
    textAlign: 'right',
  },
  voiceDurationOwn: {
    fontSize: 12,
    color: 'rgba(224, 231, 255, 0.6)',
    minWidth: 32,
    textAlign: 'right',
  },
  whisperBadge: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
    marginTop: 4,
  },
  // ── Summary Card ──
  summaryCard: {
    backgroundColor: 'rgba(129, 140, 248, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.2)',
    padding: 14,
    marginBottom: 10,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryIcon: {
    fontSize: 14,
    color: '#818CF8',
    marginRight: 6,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#818CF8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryBody: {
    fontSize: 14,
    lineHeight: 20,
    color: '#E2E8F0',
  },
  // ── Empty State ──
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 15,
    color: 'rgba(148, 163, 184, 0.5)',
  },
  // ── Suggestion Pills ──
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 6,
  },
  suggestionPill: {
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.3)',
  },
  suggestionPillText: {
    color: '#818CF8',
    fontSize: 13,
    fontWeight: '600',
  },
  // ── Orb Area ──
  orbArea: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 2,
  },
  orbLabel: {
    fontSize: 13,
    color: 'rgba(148, 163, 184, 0.5)',
    marginTop: -8,
    letterSpacing: 0.3,
  },
  // ── Input Bar ──
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: 28,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.08)',
    gap: 8,
  },
  textInput: {
    flex: 1,
    height: 42,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 21,
    paddingHorizontal: 16,
    color: '#F1F5F9',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)',
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#818CF8',
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(129, 140, 248, 0.3)',
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
});

export default ChatRoomScreen;
