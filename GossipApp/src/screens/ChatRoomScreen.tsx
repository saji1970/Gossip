import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { Group } from '../utils/GroupStorage';
import { useApp } from '../context/AppContext';

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

const ChatRoomScreen: React.FC<ChatRoomScreenProps> = ({ navigation, route }) => {
  const { user, getGroupById } = useApp();
  const groupId = route?.params?.group?.id;
  const [group, setGroup] = useState<Group | undefined>(route?.params?.group);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (groupId) {
      // Get latest group data from context
      const currentGroup = getGroupById(groupId);
      if (currentGroup) {
        setGroup(currentGroup);
      }
      loadMessages();
    }
  }, [groupId]);

  const loadMessages = () => {
    if (groupId) {
      const groupMessages = messagesByGroup.get(groupId) || [];
      setMessages(groupMessages);
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !groupId || sending) return;

    setSending(true);
    
    setTimeout(() => {
      const userEmail = user?.email || 'user@example.com';
      const userName = user?.displayName || 'You';
      
      const message: Message = {
        id: Date.now().toString(),
        senderId: userEmail,
        senderName: userName,
        content: newMessage.trim(),
        timestamp: new Date(),
        isOwnMessage: true,
      };

      // Save message
      const groupMessages = messagesByGroup.get(groupId) || [];
      groupMessages.push(message);
      messagesByGroup.set(groupId, groupMessages);

      setMessages([...groupMessages]);
      setNewMessage('');
      setSending(false);
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 300);
  };

  const handleAttachment = (type: 'photo' | 'video' | 'document') => {
    if (!groupId || sending) return;

    setSending(true);
    
    setTimeout(() => {
      const userEmail = user?.email || 'user@example.com';
      const userName = user?.displayName || 'You';
      
      const attachmentMessage: Message = {
        id: Date.now().toString(),
        senderId: userEmail,
        senderName: userName,
        content: type === 'photo' ? '📷 Photo' : type === 'video' ? '📹 Video' : '📄 Document',
        timestamp: new Date(),
        isOwnMessage: true,
      };

      const groupMessages = messagesByGroup.get(groupId) || [];
      groupMessages.push(attachmentMessage);
      messagesByGroup.set(groupId, groupMessages);

      setMessages([...groupMessages]);
      setSending(false);
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
      Alert.alert('Sent', `${type.charAt(0).toUpperCase() + type.slice(1)} sent successfully!`);
    }, 500);
  };

  const handleVoiceMessage = () => {
    if (!groupId || sending) return;

    Alert.alert(
      'Voice Message',
      'Hold to record voice message',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Sample',
          onPress: () => {
            setSending(true);
            
            setTimeout(() => {
              const userEmail = user?.email || 'user@example.com';
              const userName = user?.displayName || 'You';
              
              const voiceMessage: Message = {
                id: Date.now().toString(),
                senderId: userEmail,
                senderName: userName,
                content: '🎤 Voice message (0:15)',
                timestamp: new Date(),
                isOwnMessage: true,
              };

              const groupMessages = messagesByGroup.get(groupId) || [];
              groupMessages.push(voiceMessage);
              messagesByGroup.set(groupId, groupMessages);

              setMessages([...groupMessages]);
              setSending(false);
              
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }, 500);
          }
        }
      ]
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
              navigation.navigate('GroupCall', { 
                group, 
                callType: type 
              });
            }
          },
        },
      ]
    );
  };

  const handleChatWithMember = (memberEmail: string) => {
    Alert.alert(
      'Direct Message',
      `Start a private chat with ${memberEmail}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Chat',
          onPress: () => {
            Alert.alert('Coming Soon', 'Direct messaging will be available soon!');
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

  const renderMessage = ({ item: message }: { item: Message }) => {
    const avatarColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    const avatarColor = avatarColors[message.senderName.length % avatarColors.length];

    return (
      <View style={[
        styles.messageContainer,
        message.isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
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
            message.isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
          ]}>
            {formatMessageTime(message.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>💬</Text>
      <Text style={styles.emptyTitle}>Start the conversation</Text>
      <Text style={styles.emptyDescription}>
        Send your first message to begin chatting in this group
      </Text>
    </View>
  );

  if (!group) {
    return (
      <View style={styles.container}>
        <Text>No group selected</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Group Info Header */}
        <View style={styles.groupHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('ChatList')}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          
          <View style={styles.groupAvatarContainer}>
            <View style={styles.groupAvatarCircle}>
              <Text style={styles.groupAvatarText}>{group.name.charAt(0).toUpperCase()}</Text>
            </View>
          </View>
          
          <View style={styles.groupInfo}>
            <Text style={styles.groupName}>{group.name}</Text>
            <Text style={styles.groupMembers}>{group.members?.length || 1} members</Text>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => handleStartCall('voice')}
            >
              <Text style={styles.callIcon}>📞</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => handleStartCall('video')}
            >
              <Text style={styles.callIcon}>📹</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => {
                if (group) {
                  const approvedMembers = group.members.filter(m => m.status === 'approved');
                  const memberList = approvedMembers.map(m => m.email).join('\n');
                  Alert.alert(
                    'Group Members',
                    `${approvedMembers.length} members:\n\n${memberList}`,
                    approvedMembers.slice(0, 5).map(m => ({
                      text: `Chat with ${m.email}`,
                      onPress: () => handleChatWithMember(m.email)
                    })).concat([{ text: 'Close', style: 'cancel' }])
                  );
                }
              }}
            >
              <Text style={styles.callIcon}>👥</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages List */}
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

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity
              style={styles.emojiButton}
              onPress={() => Alert.alert('Emoji Picker', 'Select emoji to add to message')}
            >
              <Text style={styles.emoji}>😊</Text>
            </TouchableOpacity>
            
            <TextInput
              style={styles.messageInput}
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={1000}
            />
            
            <TouchableOpacity
              style={styles.mediaButton}
              onPress={() => {
                Alert.alert(
                  'Attach File',
                  'Choose attachment type',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: '📷 Photo', onPress: () => handleAttachment('photo') },
                    { text: '📹 Video', onPress: () => handleAttachment('video') },
                    { text: '📄 Document', onPress: () => handleAttachment('document') },
                  ]
                );
              }}
              disabled={sending}
            >
              <Text style={styles.mediaIcon}>📎</Text>
            </TouchableOpacity>
            
            {newMessage.trim() ? (
              <TouchableOpacity
                style={[styles.sendButton, sending && styles.sendButtonDisabled]}
                onPress={handleSendMessage}
                disabled={sending}
              >
                <Text style={styles.sendIcon}>➤</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.micButton}
                onPress={() => handleVoiceMessage()}
              >
                <Text style={styles.micIcon}>🎤</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#075E54',
  },
  keyboardView: {
    flex: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#075E54',
    borderBottomWidth: 1,
    borderBottomColor: '#128C7E',
    paddingTop: 50,
  },
  backButton: {
    marginRight: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  groupAvatarContainer: {
    marginRight: 12,
  },
  groupAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#128C7E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  groupMembers: {
    fontSize: 13,
    color: '#B8C5C2',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  callButton: {
    padding: 8,
  },
  callIcon: {
    fontSize: 20,
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#ECE5DD',
  },
  messagesContent: {
    padding: 16,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: 16,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
  },
  messageBubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  ownMessageBubble: {
    backgroundColor: '#DCF8C6',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownMessageText: {
    color: '#303030',
  },
  otherMessageText: {
    color: '#303030',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  ownMessageTime: {
    color: '#667781',
  },
  otherMessageTime: {
    color: '#667781',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 24,
  },
  inputContainer: {
    padding: 12,
    backgroundColor: '#F0F0F0',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 48,
  },
  messageInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    maxHeight: 100,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  emojiButton: {
    padding: 4,
    marginRight: 4,
  },
  emoji: {
    fontSize: 24,
  },
  mediaButton: {
    padding: 4,
    marginLeft: 4,
  },
  mediaIcon: {
    fontSize: 24,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#075E54',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  sendIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  micIcon: {
    fontSize: 24,
  },
});

export default ChatRoomScreen;
