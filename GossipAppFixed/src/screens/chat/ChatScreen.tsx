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
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { launchImageLibrary, launchCamera, MediaType, ImagePickerResponse } from 'react-native-image-picker';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { messageService } from '../../services/MessageService';
import { groupService } from '../../services/GroupService';
import { authService } from '../../services/AuthService';
import { callService } from '../../services/CallService';
import { Message, Group, User } from '../../types';

const { width: screenWidth } = Dimensions.get('window');

export const ChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { groupId } = route.params as { groupId?: string };
  
  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (groupId) {
      loadChatData();
    } else {
      setLoading(false);
    }
  }, [groupId]);

  const loadChatData = async () => {
    try {
      const [groupData, userData] = await Promise.all([
        groupService.getGroupById(groupId!),
        authService.getCurrentUser(),
      ]);

      if (!groupData) {
        Alert.alert('Error', 'Group not found');
        navigation.goBack();
        return;
      }

      setGroup(groupData);
      setUser(userData);
      
      // Load messages
      const groupMessages = await messageService.getMessages(groupId!);
      setMessages(groupMessages);

      // Update navigation title
      navigation.setOptions({ title: groupData.name });
    } catch (error) {
      console.error('Error loading chat data:', error);
      Alert.alert('Error', 'Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !groupId || sending) return;

    setSending(true);
    try {
      const message = await messageService.sendMessage(groupId, newMessage.trim());
      setMessages(prev => [...prev, message]);
      setNewMessage('');
      
      // Scroll to bottom to show new message
      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleMediaUpload = () => {
    Alert.alert(
      'Send Media',
      'Choose an option',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => selectMedia('camera', 'photo') },
        { text: 'Choose Photo', onPress: () => selectMedia('gallery', 'photo') },
        { text: 'Take Video', onPress: () => selectMedia('camera', 'video') },
        { text: 'Choose Video', onPress: () => selectMedia('gallery', 'video') },
      ]
    );
  };

  const selectMedia = (source: 'camera' | 'gallery', type: 'photo' | 'video') => {
    const options = {
      mediaType: (type === 'photo' ? 'photo' : 'video') as MediaType,
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
      durationLimit: type === 'video' ? 60 : undefined, // 60 seconds for video
      videoQuality: type === 'video' ? 'medium' as any : undefined,
    };

    if (source === 'camera') {
      launchCamera(options, handleMediaResponse);
    } else {
      launchImageLibrary(options, handleMediaResponse);
    }
  };

  const handleMediaResponse = async (response: ImagePickerResponse) => {
    if (response.didCancel || response.errorMessage || !groupId) {
      return;
    }

    if (response.assets && response.assets.length > 0) {
      const asset = response.assets[0];
      if (asset.uri) {
        setSending(true);
        try {
          const messageType = asset.type?.startsWith('video') ? 'video' : 'image';
          const fileSize = asset.fileSize || 0;
          
          const message = await messageService.sendMessage(
            groupId,
            `📎 ${messageType === 'image' ? 'Photo' : 'Video'}`,
            messageType,
            asset.uri,
            fileSize
          );
          
          setMessages(prev => [...prev, message]);
          flatListRef.current?.scrollToEnd({ animated: true });
        } catch (error) {
          Alert.alert('Error', 'Failed to send media');
        } finally {
          setSending(false);
        }
      }
    }
  };

  const handleStartCall = (callType: 'voice' | 'video') => {
    Alert.alert(
      `Start ${callType === 'voice' ? 'Voice' : 'Video'} Call`,
      `Are you sure you want to start a ${callType} call with this group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Call',
          onPress: async () => {
            try {
              const call = await callService.startGroupCall(groupId!, callType);
              navigation.navigate('GroupCall' as never, { callId: call.id } as never);
            } catch (error) {
              Alert.alert('Error', 'Failed to start call');
            }
          },
        },
      ]
    );
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    try {
      await messageService.addReaction(messageId, emoji);
      // Refresh messages to show updated reactions
      const updatedMessages = await messageService.getMessages(groupId!);
      setMessages(updatedMessages);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
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
    const isOwnMessage = message.senderId === user?.id;
    const senderName = isOwnMessage ? (user?.username || 'You') : `User ${message.senderId.slice(-4)}`;
    const senderPhone = isOwnMessage ? (user?.phone || '+91 00000 00000') : `+91 ${message.senderId.slice(-10)}`;
    
    // Generate avatar colors based on sender name
    const avatarColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    const avatarColor = avatarColors[senderName.length % avatarColors.length];

    const renderMediaContent = () => {
      if (message.messageType === 'image' && message.fileUrl) {
        return (
          <Image
            source={{ uri: message.fileUrl }}
            style={styles.mediaContent}
            resizeMode="cover"
          />
        );
      } else if (message.messageType === 'video' && message.fileUrl) {
        return (
          <View style={styles.videoContainer}>
            <Icon name="play-circle" size={48} color="#FFFFFF" />
            <Text style={styles.videoLabel}>Video</Text>
          </View>
        );
      }
      return null;
    };

    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        {!isOwnMessage && (
          <View style={styles.senderInfo}>
            <View style={[styles.senderAvatar, { backgroundColor: avatarColor }]}>
              <Text style={styles.avatarText}>{senderName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.senderDetails}>
              <Text style={[styles.senderName, { color: avatarColor }]}>
                ~ {senderName}
              </Text>
              <Text style={styles.senderPhone}>{senderPhone}</Text>
            </View>
          </View>
        )}
        
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
          (message.messageType === 'image' || message.messageType === 'video') && styles.mediaBubble
        ]}>
          {renderMediaContent()}
          
          {message.content && (
            <Text style={[
              styles.messageText,
              isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
              (message.messageType === 'image' || message.messageType === 'video') && styles.mediaText
            ]}>
              {message.content}
            </Text>
          )}
          
          {message.isEdited && (
            <Text style={styles.editedLabel}>(edited)</Text>
          )}
          
          <Text style={[
            styles.messageTime,
            isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
          ]}>
            {formatMessageTime(message.timestamp)}
          </Text>
        </View>

        {message.reactions.length > 0 && (
          <View style={styles.reactionsContainer}>
            {message.reactions.map((reaction, index) => (
              <TouchableOpacity
                key={index}
                style={styles.reaction}
                onPress={() => handleAddReaction(message.id, reaction.emoji)}
              >
                <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                <Text style={styles.reactionCount}>
                  {message.reactions.filter(r => r.emoji === reaction.emoji).length}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="message-circle" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>Start the conversation</Text>
      <Text style={styles.emptyDescription}>
        Send your first message to begin gossiping securely in this group
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Group Not Found</Text>
          <Text style={styles.errorDescription}>
            The group you're looking for doesn't exist or you don't have access to it.
          </Text>
          <Button
            title="Go Back"
            onPress={() => navigation.goBack()}
            style={styles.errorButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Group Info Header */}
        <View style={styles.groupHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.groupAvatar}>
            <View style={styles.groupAvatarCircle}>
              <Text style={styles.groupAvatarText}>{group.name.charAt(0).toUpperCase()}</Text>
            </View>
          </View>
          
          <View style={styles.groupInfo}>
            <Text style={styles.groupName}>{group.name}</Text>
            <Text style={styles.groupMembers}>{group.members.length} members</Text>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => handleStartCall('voice')}
            >
              <Icon name="phone" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => handleStartCall('video')}
            >
              <Icon name="video" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.groupSettingsButton}
              onPress={() => {
                // Navigate to group settings
                Alert.alert('Group Settings', 'Group settings feature would be implemented here');
              }}
            >
              <Icon name="more-vertical" size={20} color="#FFFFFF" />
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
              onPress={() => {
                // Emoji picker functionality
                Alert.alert('Emoji Picker', 'Emoji picker would be implemented here');
              }}
            >
              <Icon name="smile" size={24} color="#6B7280" />
            </TouchableOpacity>
            
            <TextInput
              style={styles.messageInput}
              placeholder="Message"
              placeholderTextColor="#9CA3AF"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={1000}
            />
            
            <TouchableOpacity
              style={styles.mediaButton}
              onPress={handleMediaUpload}
              disabled={sending}
            >
              <Icon
                name="paperclip"
                size={24}
                color={sending ? "#9CA3AF" : "#6B7280"}
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={() => {
                // Camera functionality
                Alert.alert('Camera', 'Camera feature would be implemented here');
              }}
              disabled={sending}
            >
              <Icon
                name="camera"
                size={24}
                color={sending ? "#9CA3AF" : "#6B7280"}
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.micButton}
              onPress={() => {
                // Voice message functionality
                Alert.alert('Voice Message', 'Voice message feature would be implemented here');
              }}
              disabled={sending}
            >
              <Icon
                name="mic"
                size={24}
                color={sending ? "#9CA3AF" : "#6B7280"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#075E54', // WhatsApp green background
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  errorButton: {
    minWidth: 120,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#075E54',
    borderBottomWidth: 1,
    borderBottomColor: '#128C7E',
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
    fontSize: 14,
    color: '#B8C5C2',
    marginTop: 2,
  },
  backButton: {
    marginRight: 12,
  },
  groupAvatar: {
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupSettingsButton: {
    padding: 8,
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#ECE5DD', // WhatsApp chat background
  },
  messagesContent: {
    padding: 16,
    flexGrow: 1,
    backgroundColor: '#ECE5DD',
  },
  messageContainer: {
    marginBottom: 16,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  senderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  senderDetails: {
    flex: 1,
  },
  senderName: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
    fontWeight: '500',
  },
  senderPhone: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  ownSenderName: {
    color: '#6366F1',
    textAlign: 'right',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  ownMessageBubble: {
    backgroundColor: '#DCF8C6', // WhatsApp green bubble
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownMessageText: {
    color: '#303030', // Dark text on light green background
  },
  otherMessageText: {
    color: '#303030', // Dark text on white background
  },
  editedLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
    marginTop: 4,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  messageTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  ownMessageTime: {
    color: '#667781',
  },
  otherMessageTime: {
    color: '#667781',
  },
  reactionsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  reaction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  messageActions: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
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
    padding: 16,
    backgroundColor: '#F0F0F0',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 48,
  },
  messageInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  emojiButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  mediaButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cameraButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  mediaBubble: {
    padding: 0,
    overflow: 'hidden',
  },
  mediaContent: {
    width: '100%',
    height: 200,
    maxWidth: screenWidth * 0.7,
  },
  videoContainer: {
    width: '100%',
    height: 200,
    maxWidth: screenWidth * 0.7,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  videoLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 8,
  },
  mediaText: {
    padding: 12,
    paddingTop: 8,
  },
});
