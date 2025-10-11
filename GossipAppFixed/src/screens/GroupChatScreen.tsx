/**
 * Group Chat Screen
 * Real-time transient chat with text, media, and stickers
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { Group, LocalUserState, TransientMessage, LocalMessage } from '../types';
import { STICKER_PACK } from '../types/Sticker';
import {
  subscribeToMessages,
  sendTextMessage,
  sendStickerMessage,
  sendMediaMessage,
} from '../modules/chat/messagingService';
import { getChatHistory, saveChatHistory } from '../utils/storage';

interface GroupChatScreenProps {
  group: Group;
  profile: LocalUserState;
  onBack: () => void;
}

const GroupChatScreen: React.FC<GroupChatScreenProps> = ({
  group,
  profile,
  onBack,
}) => {
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Load local history
    loadHistory();

    // Subscribe to new messages
    const unsubscribe = subscribeToMessages(
      group.groupId,
      (message) => {
        const localMsg: LocalMessage = {
          ...message,
          localId: Date.now().toString(),
          isSavedLocally: true,
          deliveryStatus: 'sent',
        };
        
        setMessages((prev) => {
          const updated = [...prev, localMsg];
          saveHistory(updated);
          return updated;
        });
      },
      (error) => {
        console.error('Message subscription error:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [group.groupId]);

  const loadHistory = async () => {
    const history = await getChatHistory(group.groupId);
    setMessages(history);
  };

  const saveHistory = async (msgs: LocalMessage[]) => {
    await saveChatHistory(group.groupId, msgs);
  };

  const handleSendText = async () => {
    if (!inputText.trim()) return;

    try {
      await sendTextMessage(profile.anonId, group.groupId, inputText.trim());
      setInputText('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleSendSticker = async (stickerKey: string) => {
    try {
      await sendStickerMessage(profile.anonId, group.groupId, stickerKey);
      setShowStickers(false);
    } catch (error) {
      console.error('Error sending sticker:', error);
    }
  };

  const handleSelectImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'mixed',
      includeBase64: true,
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 0.7,
    });

    if (result.didCancel || !result.assets || !result.assets[0].base64) {
      return;
    }

    const asset = result.assets[0];
    const mediaType = asset.type?.startsWith('video') ? 'video' : 'photo';
    const base64Data = `data:${asset.type};base64,${asset.base64}`;

    try {
      await sendMediaMessage(profile.anonId, group.groupId, base64Data, mediaType);
    } catch (error) {
      console.error('Error sending media:', error);
    }
  };

  const renderMessage = (msg: LocalMessage) => {
    const isOwnMessage = msg.senderAnonId === profile.anonId;

    return (
      <View
        key={msg.id || msg.localId}
        style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        {!isOwnMessage && (
          <Text style={styles.senderName}>
            {msg.senderAnonId.substring(0, 8)}...
          </Text>
        )}
        
        {msg.messageType === 'text' && (
          <Text style={styles.messageText}>{msg.content}</Text>
        )}
        
        {msg.messageType === 'sticker' && (
          <Text style={styles.stickerEmoji}>
            {STICKER_PACK.find((s) => s.key === msg.stickerKey)?.emoji || msg.content}
          </Text>
        )}
        
        {msg.messageType === 'media' && (
          <Image
            source={{ uri: msg.content }}
            style={styles.mediaImage}
            resizeMode="cover"
          />
        )}
        
        <Text style={styles.messageTime}>
          {new Date(msg.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{group.groupName}</Text>
          <Text style={styles.headerSubtitle}>
            {group.memberAnonIds.length} members • {group.type === 'public' ? '🌐' : '🔒'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No messages yet. Start the conversation!
              </Text>
              <Text style={styles.emptySubtext}>
                ⏱️ Messages auto-delete after 10 seconds
              </Text>
            </View>
          ) : (
            messages.map((msg) => renderMessage(msg))
          )}
        </ScrollView>

        {/* Sticker Picker */}
        {showStickers && (
          <View style={styles.stickerPicker}>
            {STICKER_PACK.map((sticker) => (
              <TouchableOpacity
                key={sticker.key}
                style={styles.stickerButton}
                onPress={() => handleSendSticker(sticker.key)}
              >
                <Text style={styles.stickerEmoji}>{sticker.emoji}</Text>
                <Text style={styles.stickerLabel}>{sticker.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowStickers(!showStickers)}
          >
            <Text style={styles.iconButtonText}>
              {showStickers ? '⌨️' : '😀'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.iconButton} onPress={handleSelectImage}>
            <Text style={styles.iconButtonText}>📷</Text>
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#666"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSendText}
            disabled={!inputText.trim()}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 5,
    marginRight: 10,
  },
  backText: {
    fontSize: 28,
    color: '#4CAF50',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 15,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#4CAF50',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#2a2a2a',
  },
  senderName: {
    fontSize: 10,
    color: '#888',
    marginBottom: 4,
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
  },
  stickerEmoji: {
    fontSize: 48,
  },
  mediaImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  messageTime: {
    fontSize: 10,
    color: '#ccc',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  stickerPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#2a2a2a',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  stickerButton: {
    width: '16%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: '0.5%',
  },
  stickerLabel: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#1a1a1a',
  },
  iconButton: {
    padding: 8,
    marginRight: 5,
  },
  iconButtonText: {
    fontSize: 24,
  },
  input: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    color: '#fff',
    padding: 10,
    borderRadius: 20,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: 5,
  },
  sendButtonDisabled: {
    backgroundColor: '#555',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default GroupChatScreen;

