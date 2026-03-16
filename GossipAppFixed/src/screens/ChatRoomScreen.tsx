import React, { useState, useEffect, useRef } from 'react';
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
import VoiceInputBar from '../components/voice/VoiceInputBar';
import VoiceMessageBubble from '../components/voice/VoiceMessageBubble';
import VoiceCommandOverlay from '../components/voice/VoiceCommandOverlay';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { useTTS } from '../hooks/useTTS';
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
  type: 'text' | 'voice';
  audioUri?: string;
  audioDuration?: number;
  whisperTo?: string[];
}

// Simple message storage - persists across the app
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
  const [voiceOverlayVisible, setVoiceOverlayVisible] = useState(false);

  useEffect(() => {
    if (groupId) {
      const currentGroup = getGroupById(groupId);
      if (currentGroup) {
        setGroup(currentGroup);
      }
      loadMessages();
    }
  }, [groupId]);

  // Update last-read timestamp when messages change
  useEffect(() => {
    if (groupId && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const ts = lastMsg.timestamp instanceof Date
        ? lastMsg.timestamp.getTime()
        : new Date(lastMsg.timestamp).getTime();
      LastReadService.setLastReadTimestamp(groupId, ts);
    }
  }, [groupId, messages.length]);

  const loadMessages = () => {
    if (groupId) {
      const groupMessages = messagesByGroup.get(groupId) || [];
      setMessages(groupMessages);
    }
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim() || !groupId || sending) return;

    setSending(true);

    setTimeout(() => {
      const userEmail = user?.email || 'user@example.com';
      const userName = user?.displayName || 'You';

      const message: Message = {
        id: Date.now().toString(),
        senderId: userEmail,
        senderName: userName,
        content: text.trim(),
        timestamp: new Date(),
        isOwnMessage: true,
        type: 'text',
      };

      const groupMessages = messagesByGroup.get(groupId) || [];
      groupMessages.push(message);
      messagesByGroup.set(groupId, groupMessages);

      setMessages([...groupMessages]);
      setSending(false);

      // Also send to backend if available
      api.sendMessage(groupId, userName, text.trim()).catch(() => {});

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 300);
  };

  const handleSendVoiceMessage = (audioUri: string, durationMs: number, whisperTo?: string[]) => {
    if (!groupId) return;

    const userEmail = user?.email || 'user@example.com';
    const userName = user?.displayName || 'You';

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

    const groupMessages = messagesByGroup.get(groupId) || [];
    groupMessages.push(message);
    messagesByGroup.set(groupId, groupMessages);

    setMessages([...groupMessages]);

    // Upload to backend if available
    api.sendVoiceMessage(groupId, audioUri, durationMs, userName, whisperTo).catch(() => {});

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleDeleteMessage = (messageId: string) => {
    Alert.alert(
      'Delete message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (!groupId) return;
            const groupMessages = messagesByGroup.get(groupId) || [];
            const updated = groupMessages.filter(m => m.id !== messageId);
            messagesByGroup.set(groupId, updated);
            setMessages([...updated]);
            // Best-effort backend delete
            api.deleteMessage(messageId).catch(() => {});
          },
        },
      ],
    );
  };

  const handleStartCall = (type: 'voice' | 'video') => {
    Alert.alert(
      `${type === 'voice' ? 'Voice' : 'Video'} Call`,
      `Start a group ${type} call with all members?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Call',
          onPress: () => {
            if (navigation) {
              navigation.navigate('GroupCall', { group, callType: type });
            }
          },
        },
      ]
    );
  };

  const formatMessageTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

    return timestamp.toLocaleDateString();
  };

  // Build whisper member list for the picker (approved members excluding self)
  const whisperMembers: WhisperMember[] = (group?.members || [])
    .filter(m => m.status === 'approved' && m.email !== user?.email)
    .map(m => ({ email: m.email }));

  // Filter messages: hide whispers not addressed to current user
  const visibleMessages = messages.filter((msg) => {
    if (!msg.whisperTo || msg.whisperTo.length === 0) return true;
    const currentEmail = user?.email || '';
    return msg.isOwnMessage || msg.whisperTo.includes(currentEmail);
  });

  const handleVoiceCommand = (type: string, payload: string) => {
    switch (type) {
      case 'read_latest':
        tts.speakLatest(visibleMessages);
        break;
      case 'read_unread':
        if (groupId) {
          tts.speakUnread(groupId, visibleMessages);
        }
        break;
      case 'send_message':
        if (payload) handleSendMessage(payload);
        break;
      case 'call_group':
        handleStartCall('voice');
        break;
      default:
        break;
    }
  };

  const handleReadAloudPress = () => {
    if (tts.isSpeaking) {
      tts.stop();
    } else {
      tts.speakLatest(visibleMessages);
    }
  };

  const handleReadAloudLongPress = () => {
    if (tts.isSpeaking) {
      tts.stop();
    } else if (groupId) {
      tts.speakUnread(groupId, visibleMessages);
    }
  };

  // Resolve whisperTo emails to display names
  const getWhisperNames = (whisperTo?: string[]): string[] => {
    if (!whisperTo) return [];
    return whisperTo.map((email) => {
      const member = group?.members?.find(m => m.email === email);
      return member?.email.split('@')[0] || email;
    });
  };

  const renderMessage = ({ item: message }: { item: Message }) => {
    const avatarColors = ['#818CF8', '#34D399', '#FB923C', '#F87171', '#60A5FA', '#A78BFA', '#F472B6'];
    const avatarColor = avatarColors[message.senderName.length % avatarColors.length];
    const timeText = formatMessageTime(message.timestamp);

    const Wrapper = message.isOwnMessage ? TouchableOpacity : View;
    const wrapperProps = message.isOwnMessage
      ? { onLongPress: () => handleDeleteMessage(message.id), activeOpacity: 0.7 }
      : {};

    return (
      <Wrapper
        style={[
          styles.messageContainer,
          message.isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
        {...wrapperProps}
      >
        {!message.isOwnMessage && (
          <View style={styles.senderInfo}>
            <View style={[styles.senderAvatar, { backgroundColor: avatarColor }]}>
              <Text style={styles.avatarText}>{message.senderName.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={[styles.senderName, { color: avatarColor }]}>
              ~ {message.senderName}
            </Text>
          </View>
        )}

        {message.type === 'voice' && message.audioUri ? (
          <VoiceMessageBubble
            audioUri={message.audioUri}
            durationMs={message.audioDuration || 0}
            isOwnMessage={message.isOwnMessage}
            isWhisper={!!message.whisperTo && message.whisperTo.length > 0}
            whisperToNames={getWhisperNames(message.whisperTo)}
            isPlaying={playback.isPlaying}
            isCurrentTrack={playback.currentUri === message.audioUri}
            progress={playback.currentUri === message.audioUri ? playback.progress : 0}
            onPlay={() => playback.play(message.audioUri!, message.audioDuration)}
            timestamp={timeText}
          />
        ) : (
          <View style={[
            styles.messageBubble,
            message.isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
          ]}>
            {message.whisperTo && message.whisperTo.length > 0 && (
              <View style={styles.whisperLabel}>
                <Text style={styles.whisperLabelText}>
                  &#x1F512; Whisper to {getWhisperNames(message.whisperTo).join(', ')}
                </Text>
              </View>
            )}
            <Text style={[
              styles.messageText,
              message.isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
            ]}>
              {message.content}
            </Text>

            <Text style={[
              styles.messageTime,
              message.isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime,
            ]}>
              {timeText}
            </Text>
          </View>
        )}
      </Wrapper>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>&#x1F4AC;</Text>
      <Text style={styles.emptyTitle}>No messages yet</Text>
      <Text style={styles.emptyDescription}>
        Send the first message to start the conversation
      </Text>
    </View>
  );

  if (!group) {
    return (
      <View style={styles.container}>
        <Text style={{ color: Colors.textPrimary }}>No group selected</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.groupHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('ChatList')}
          >
            <Text style={styles.backButtonText}>&#x2190;</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.groupInfo}
            onPress={() => setShowMembers(!showMembers)}
            activeOpacity={0.7}
          >
            <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
            <Text style={styles.groupMembers}>
              {group.members?.filter(m => m.status === 'approved').length || 1} members {showMembers ? '\u25B2' : '\u25BC'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleReadAloudPress}
            onLongPress={handleReadAloudLongPress}
            activeOpacity={0.7}
          >
            <Text style={styles.headerButtonIcon}>
              {tts.isSpeaking ? '\u23F9' : '\u{1F50A}'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setVoiceOverlayVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.headerButtonIcon}>{'\u{1F3A4}'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.callButton}
            onPress={() => handleStartCall('voice')}
          >
            <Text style={styles.callIcon}>&#x1F4DE;</Text>
          </TouchableOpacity>
        </View>

        {/* Members Panel */}
        {showMembers && group.members && (
          <View style={styles.membersPanel}>
            {group.members
              .filter(m => m.status === 'approved')
              .map((member) => {
                const isCurrentUser = member.email === user?.email;
                const roleColors: Record<string, string> = {
                  admin: '#F59E0B',
                  approver: '#818CF8',
                  member: Colors.textMuted,
                };
                return (
                  <View key={member.email} style={styles.memberRow}>
                    <View style={[styles.memberAvatar, isCurrentUser && { backgroundColor: Colors.accent }]}>
                      <Text style={styles.memberAvatarText}>
                        {member.email.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberDetails}>
                      <Text style={styles.memberEmail} numberOfLines={1}>
                        {member.email}{isCurrentUser ? ' (You)' : ''}
                      </Text>
                    </View>
                    <View style={[styles.roleBadge, { backgroundColor: roleColors[member.role] || Colors.textMuted }]}>
                      <Text style={styles.roleBadgeText}>{member.role}</Text>
                    </View>
                  </View>
                );
              })}
            {group.members.filter(m => m.status === 'pending').length > 0 && (
              <Text style={styles.pendingNote}>
                + {group.members.filter(m => m.status === 'pending').length} pending approval
              </Text>
            )}
          </View>
        )}

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={visibleMessages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />

        {/* Voice Input Bar */}
        <VoiceInputBar
          onSendMessage={handleSendMessage}
          onSendVoiceMessage={handleSendVoiceMessage}
          disabled={sending}
          groupName={group.name}
          groupMembers={whisperMembers}
        />
      </KeyboardAvoidingView>

      <VoiceCommandOverlay
        visible={voiceOverlayVisible}
        onDismiss={() => setVoiceOverlayVisible(false)}
        onCommand={handleVoiceCommand}
        context="chat_room"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  // Header
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingTop: 50,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  backButtonText: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '600',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  groupMembers: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xs,
  },
  headerButtonIcon: {
    fontSize: 18,
  },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callIcon: {
    fontSize: 22,
  },
  // Members panel
  membersPanel: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  memberAvatarText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  memberDetails: {
    flex: 1,
  },
  memberEmail: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  roleBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  pendingNote: {
    fontSize: 14,
    color: Colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: Spacing.sm,
    textAlign: 'center',
  },
  // Messages
  messagesList: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  messagesContent: {
    padding: Spacing.lg,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: Spacing.lg,
    maxWidth: '85%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  senderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
  },
  messageBubble: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xxl,
  },
  ownMessageBubble: {
    backgroundColor: Colors.ownBubble,
    borderBottomRightRadius: 6,
  },
  otherMessageBubble: {
    backgroundColor: Colors.otherBubble,
    borderBottomLeftRadius: 6,
  },
  whisperLabel: {
    marginBottom: Spacing.xs,
  },
  whisperLabelText: {
    fontSize: 12,
    color: Colors.warning,
    fontWeight: '600',
  },
  messageText: {
    fontSize: 20,
    lineHeight: 28,
  },
  ownMessageText: {
    color: Colors.ownBubbleText,
  },
  otherMessageText: {
    color: Colors.otherBubbleText,
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
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 24,
  },
});

export default ChatRoomScreen;
