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
  Dimensions,
} from 'react-native';
import { Group } from '../utils/GroupStorage';
import { useApp } from '../context/AppContext';
import { Colors, BorderRadius, Spacing } from '../constants/theme';
import VoiceInputBar from '../components/voice/VoiceInputBar';
import { usePersonality } from '../hooks/usePersonality';
import ReplySuggestions from '../components/personality/ReplySuggestions';
import PersonalityBadge from '../components/personality/PersonalityBadge';
import * as api from '../services/api';
import { ReplySuggestion } from '../modules/personality/types';

const { width: screenWidth } = Dimensions.get('window');

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
}

// Simple message storage - persists across the app
const messagesByGroup = new Map<string, Message[]>();

const MOCK_SENDERS = [
  { id: 'mock-sarah', name: 'Sarah' },
  { id: 'mock-jake', name: 'Jake' },
  { id: 'mock-alex', name: 'Alex' },
];

const MOCK_MESSAGES = [
  "Yeah right, Mark is *totally* loyal",
  "OMG did you hear about the party this weekend?!",
  "I can't believe she said that behind everyone's back",
  "Why would he even do that? Makes no sense",
  "Apparently they broke up last night",
  "LOL that's hilarious, I'm dead",
  "I heard a rumor about the boss... spill the tea",
  "That's awful, are you okay?",
  "NO WAY!! Are you serious right now?!",
  "Whatever, obviously nobody cares",
];

const ChatRoomScreen: React.FC<ChatRoomScreenProps> = ({ navigation, route }) => {
  const { user, getGroupById } = useApp();
  const { analyzeMessage, suggestions, clearSuggestions } = usePersonality();
  const groupId = route?.params?.group?.id;
  const [group, setGroup] = useState<Group | undefined>(route?.params?.group);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<ReplySuggestion[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const mockIndexRef = useRef(0);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (groupId) {
      const currentGroup = getGroupById(groupId);
      if (currentGroup) {
        setGroup(currentGroup);
      }
      loadMessages();
    }
    api.healthCheck().then(setBackendOnline).catch(() => setBackendOnline(false));
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, [groupId]);

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
      };

      const groupMessages = messagesByGroup.get(groupId) || [];
      groupMessages.push(message);
      messagesByGroup.set(groupId, groupMessages);

      setMessages([...groupMessages]);
      setSending(false);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 300);
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

  const simulateIncomingMessage = () => {
    if (!groupId) return;
    const sender = MOCK_SENDERS[mockIndexRef.current % MOCK_SENDERS.length];
    const text = MOCK_MESSAGES[mockIndexRef.current % MOCK_MESSAGES.length];
    mockIndexRef.current++;

    const message: Message = {
      id: `mock-${Date.now()}`,
      senderId: sender.id,
      senderName: sender.name,
      content: text,
      timestamp: new Date(),
      isOwnMessage: false,
    };

    const groupMessages = messagesByGroup.get(groupId) || [];
    groupMessages.push(message);
    messagesByGroup.set(groupId, groupMessages);
    setMessages([...groupMessages]);

    // Feed to local personality engine (always runs)
    analyzeMessage(sender.id, sender.name, text);

    // If backend is online, also send for AI analysis
    if (backendOnline) {
      api.analyzeMessage(text, groupId, sender.id, sender.name)
        .then((result) => {
          if (result.reply_suggestions?.length > 0) {
            const mapped: ReplySuggestion[] = result.reply_suggestions.map((s) => ({
              text: s,
              tone: result.emotion,
            }));
            setAiSuggestions(mapped);
            if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
            aiTimerRef.current = setTimeout(() => setAiSuggestions([]), 10000);
          }
        })
        .catch(() => {});
    }

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSuggestionSelect = (text: string) => {
    clearSuggestions();
    setAiSuggestions([]);
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    handleSendMessage(text);
  };

  // Merge local + AI suggestions, prefer AI when available
  const activeSuggestions = aiSuggestions.length > 0 ? aiSuggestions : suggestions;

  const formatMessageTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

    return timestamp.toLocaleDateString();
  };

  const renderMessage = ({ item: message }: { item: Message }) => {
    const avatarColors = ['#818CF8', '#34D399', '#FB923C', '#F87171', '#60A5FA', '#A78BFA', '#F472B6'];
    const avatarColor = avatarColors[message.senderName.length % avatarColors.length];

    return (
      <View style={[
        styles.messageContainer,
        message.isOwnMessage ? styles.ownMessage : styles.otherMessage,
      ]}>
        {!message.isOwnMessage && (
          <View style={styles.senderInfo}>
            <View style={[styles.senderAvatar, { backgroundColor: avatarColor }]}>
              <Text style={styles.avatarText}>{message.senderName.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={[styles.senderName, { color: avatarColor }]}>
              ~ {message.senderName}
            </Text>
            <PersonalityBadge speakerId={message.senderId} />
          </View>
        )}

        <View style={[
          styles.messageBubble,
          message.isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
        ]}>
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
            {formatMessageTime(message.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🎙️</Text>
      <Text style={styles.emptyTitle}>Start talking</Text>
      <Text style={styles.emptyDescription}>
        Tap the mic and say your first message
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
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          <View style={styles.groupInfo}>
            <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
            <Text style={styles.groupMembers}>{group.members?.length || 1} members</Text>
          </View>

          <TouchableOpacity
            style={styles.simButton}
            onPress={simulateIncomingMessage}
          >
            <Text style={styles.simIcon}>💬</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.callButton}
            onPress={() => handleStartCall('voice')}
          >
            <Text style={styles.callIcon}>📞</Text>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />

        {/* Reply Suggestions */}
        <ReplySuggestions
          suggestions={activeSuggestions}
          onSelect={handleSuggestionSelect}
          visible={activeSuggestions.length > 0}
        />

        {/* Voice Input Bar */}
        <VoiceInputBar
          onSendMessage={handleSendMessage}
          disabled={sending}
          groupName={group.name}
        />
      </KeyboardAvoidingView>
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
  simButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  simIcon: {
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
