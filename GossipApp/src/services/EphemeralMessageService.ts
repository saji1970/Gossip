import AsyncStorage from '@react-native-async-storage/async-storage';
import { anonymousAuthService } from './AnonymousAuthService';
import { TransientMessage, LocalMessage, Group } from '../types';

/**
 * Ephemeral Message Service for Zero-Log Architecture
 * 
 * Core Principle: No messages stored centrally
 * - Uses Firestore only for real-time delivery (onSnapshot)
 * - Messages are written to temporary Firestore documents
 * - Sender immediately deletes document after successful write
 * - Receiver stores message locally and displays it
 * - Server acts only as a temporary wire
 */
export class EphemeralMessageService {
  private static instance: EphemeralMessageService;
  private localMessages: Map<string, LocalMessage[]> = new Map(); // chatId -> messages[]

  static getInstance(): EphemeralMessageService {
    if (!EphemeralMessageService.instance) {
      EphemeralMessageService.instance = new EphemeralMessageService();
    }
    return EphemeralMessageService.instance;
  }

  /**
   * Send message via transient message bus
   * Message is written to Firestore, then immediately deleted by sender
   */
  async sendMessage(
    chatId: string, 
    content: string, 
    type: 'text' | 'photo' | 'video' = 'text'
  ): Promise<LocalMessage> {
    try {
      const currentUser = await anonymousAuthService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Generate ephemeral key for immediate deletion
      const ephemeralKey = this.generateEphemeralKey();
      
      // Create transient message
      const transientMessage: TransientMessage = {
        senderId: currentUser.anonId,
        timestamp: new Date(),
        content,
        type,
        ephemeralKey,
      };

      // TODO: Write to Firestore temporary document
      // This would be implemented with Firebase Firestore
      // For now, we'll simulate the transient behavior
      await this.simulateTransientMessage(chatId, transientMessage);

      // Create local message for sender
      const localMessage: LocalMessage = {
        id: this.generateMessageId(),
        chatId,
        senderId: currentUser.anonId,
        content,
        type,
        timestamp: new Date(),
        isRead: true,
      };

      // Store locally
      await this.storeMessageLocally(localMessage);

      return localMessage;
    } catch (error) {
      throw new Error(`Failed to send message: ${error}`);
    }
  }

  /**
   * Receive message from transient bus
   * Message is stored locally and displayed
   */
  async receiveMessage(chatId: string, transientMessage: TransientMessage): Promise<LocalMessage> {
    try {
      const localMessage: LocalMessage = {
        id: this.generateMessageId(),
        chatId,
        senderId: transientMessage.senderId,
        content: transientMessage.content,
        type: transientMessage.type,
        timestamp: transientMessage.timestamp,
        isRead: false,
      };

      // Store locally
      await this.storeMessageLocally(localMessage);

      return localMessage;
    } catch (error) {
      throw new Error(`Failed to receive message: ${error}`);
    }
  }

  /**
   * Get messages for a chat (from local storage)
   */
  async getMessages(chatId: string, limit: number = 50): Promise<LocalMessage[]> {
    try {
      const messages = this.localMessages.get(chatId) || [];
      
      // Sort by timestamp (newest first) and apply limit
      return messages
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to get messages: ${error}`);
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    try {
      for (const [chatId, messages] of this.localMessages.entries()) {
        const message = messages.find(m => m.id === messageId);
        if (message) {
          message.isRead = true;
          await this.saveMessagesToStorage();
          break;
        }
      }
    } catch (error) {
      throw new Error(`Failed to mark message as read: ${error}`);
    }
  }

  /**
   * Delete chat history locally
   */
  async deleteChatHistory(chatId: string): Promise<void> {
    try {
      this.localMessages.delete(chatId);
      await this.saveMessagesToStorage();
    } catch (error) {
      throw new Error(`Failed to delete chat history: ${error}`);
    }
  }

  /**
   * Get all chat IDs with recent messages
   */
  async getRecentChats(): Promise<string[]> {
    try {
      const chatIds: string[] = [];
      
      for (const [chatId, messages] of this.localMessages.entries()) {
        if (messages.length > 0) {
          chatIds.push(chatId);
        }
      }

      // Sort by most recent message
      return chatIds.sort((a, b) => {
        const messagesA = this.localMessages.get(a) || [];
        const messagesB = this.localMessages.get(b) || [];
        const lastMessageA = messagesA.sort((x, y) => y.timestamp.getTime() - x.timestamp.getTime())[0];
        const lastMessageB = messagesB.sort((x, y) => y.timestamp.getTime() - x.timestamp.getTime())[0];
        
        if (!lastMessageA) return 1;
        if (!lastMessageB) return -1;
        
        return lastMessageB.timestamp.getTime() - lastMessageA.timestamp.getTime();
      });
    } catch (error) {
      console.error('Error getting recent chats:', error);
      return [];
    }
  }

  /**
   * Simulate transient message behavior
   * In real implementation, this would use Firestore onSnapshot
   */
  private async simulateTransientMessage(chatId: string, message: TransientMessage): Promise<void> {
    // Simulate the transient behavior
    // In real implementation:
    // 1. Write to Firestore temporary document
    // 2. Set up onSnapshot listener for receivers
    // 3. Delete document immediately after write
    // 4. Receivers get the message via onSnapshot and store locally
    
    console.log(`Transient message sent to ${chatId}:`, message);
    
    // For simulation, we'll just store it locally as if it was received
    const localMessage: LocalMessage = {
      id: this.generateMessageId(),
      chatId,
      senderId: message.senderId,
      content: message.content,
      type: message.type,
      timestamp: message.timestamp,
      isRead: false,
    };

    await this.storeMessageLocally(localMessage);
  }

  /**
   * Store message locally
   */
  private async storeMessageLocally(message: LocalMessage): Promise<void> {
    try {
      if (!this.localMessages.has(message.chatId)) {
        this.localMessages.set(message.chatId, []);
      }
      
      const messages = this.localMessages.get(message.chatId)!;
      messages.push(message);
      this.localMessages.set(message.chatId, messages);
      
      await this.saveMessagesToStorage();
    } catch (error) {
      throw new Error(`Failed to store message locally: ${error}`);
    }
  }

  /**
   * Save messages to local storage
   */
  private async saveMessagesToStorage(): Promise<void> {
    try {
      const messagesData = Array.from(this.localMessages.entries());
      await AsyncStorage.setItem('ephemeral_messages', JSON.stringify(messagesData));
    } catch (error) {
      console.error('Error saving messages to storage:', error);
    }
  }

  /**
   * Load messages from local storage
   */
  async loadMessagesFromStorage(): Promise<void> {
    try {
      const messagesData = await AsyncStorage.getItem('ephemeral_messages');
      if (messagesData) {
        const messagesArray = JSON.parse(messagesData);
        this.localMessages = new Map(messagesArray.map(([chatId, messages]: [string, any[]]) => [
          chatId,
          messages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }))
        ]));
      }
    } catch (error) {
      console.error('Error loading messages from storage:', error);
    }
  }

  /**
   * Generate ephemeral key for message deletion
   */
  private generateEphemeralKey(): string {
    return `eph_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const ephemeralMessageService = EphemeralMessageService.getInstance();

