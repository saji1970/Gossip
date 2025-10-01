import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from './AuthService';
import { encryptionService } from '../utils/encryption';
import { Message, MessageReaction, Group, User } from '../types';
import { groupService } from './GroupService';

export class MessageService {
  private static instance: MessageService;
  private messages: Map<string, Message[]> = new Map(); // groupId -> messages[]

  static getInstance(): MessageService {
    if (!MessageService.instance) {
      MessageService.instance = new MessageService();
    }
    return MessageService.instance;
  }

  async sendMessage(groupId: string, content: string, messageType: 'text' | 'image' | 'file' | 'audio' | 'video' = 'text', fileUrl?: string, fileSize?: number): Promise<Message> {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const group = await groupService.getGroupById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Check if user is a member of the group
      const member = group.members.find(m => m.userId === currentUser.id && m.status === 'approved');
      if (!member) {
        throw new Error('You are not a member of this group');
      }

      // Encrypt the message content
      const encryptedContent = await encryptionService.encryptMessage(content, group.encryptionKey);

      const message: Message = {
        id: this.generateMessageId(),
        groupId,
        senderId: currentUser.id,
        content,
        encryptedContent,
        timestamp: new Date(),
        messageType,
        fileUrl,
        fileSize,
        isEdited: false,
        isDeleted: false,
        reactions: [],
      };

      // Store message
      if (!this.messages.has(groupId)) {
        this.messages.set(groupId, []);
      }
      
      const groupMessages = this.messages.get(groupId)!;
      groupMessages.push(message);
      this.messages.set(groupId, groupMessages);

      // Save to storage
      await this.saveMessagesToStorage();

      return message;
    } catch (error) {
      throw new Error(`Failed to send message: ${error}`);
    }
  }

  async getMessages(groupId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const group = await groupService.getGroupById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Check if user is a member of the group
      const member = group.members.find(m => m.userId === currentUser.id && m.status === 'approved');
      if (!member) {
        throw new Error('You are not a member of this group');
      }

      const groupMessages = this.messages.get(groupId) || [];
      
      // Sort by timestamp (newest first) and apply pagination
      const sortedMessages = groupMessages
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(offset, offset + limit);

      // Decrypt messages for the user
      const decryptedMessages = await Promise.all(
        sortedMessages.map(async (message) => {
          try {
            const decryptedContent = await encryptionService.decryptMessage(
              message.encryptedContent,
              group.encryptionKey
            );
            return {
              ...message,
              content: decryptedContent,
            };
          } catch (error) {
            console.error('Failed to decrypt message:', error);
            return {
              ...message,
              content: '[Encrypted message - decryption failed]',
            };
          }
        })
      );

      return decryptedMessages;
    } catch (error) {
      throw new Error(`Failed to get messages: ${error}`);
    }
  }

  async editMessage(messageId: string, newContent: string): Promise<void> {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Find the message
      let message: Message | null = null;
      let groupId: string | null = null;

      for (const [id, messages] of this.messages.entries()) {
        const foundMessage = messages.find(m => m.id === messageId);
        if (foundMessage) {
          message = foundMessage;
          groupId = id;
          break;
        }
      }

      if (!message || !groupId) {
        throw new Error('Message not found');
      }

      // Check if user is the sender
      if (message.senderId !== currentUser.id) {
        throw new Error('You can only edit your own messages');
      }

      // Check if message is not too old (e.g., within 15 minutes)
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      if (message.timestamp < fifteenMinutesAgo) {
        throw new Error('Message is too old to edit');
      }

      // Get group for encryption key
      const group = await groupService.getGroupById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Encrypt new content
      const encryptedContent = await encryptionService.encryptMessage(newContent, group.encryptionKey);

      // Update message
      message.content = newContent;
      message.encryptedContent = encryptedContent;
      message.isEdited = true;
      message.editedAt = new Date();

      await this.saveMessagesToStorage();
    } catch (error) {
      throw new Error(`Failed to edit message: ${error}`);
    }
  }

  async deleteMessage(messageId: string): Promise<void> {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Find the message
      let message: Message | null = null;
      let groupId: string | null = null;

      for (const [id, messages] of this.messages.entries()) {
        const foundMessage = messages.find(m => m.id === messageId);
        if (foundMessage) {
          message = foundMessage;
          groupId = id;
          break;
        }
      }

      if (!message || !groupId) {
        throw new Error('Message not found');
      }

      // Check if user is the sender or an admin
      const group = await groupService.getGroupById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      const member = group.members.find(m => m.userId === currentUser.id);
      const isSender = message.senderId === currentUser.id;
      const isAdmin = member && ['admin', 'moderator'].includes(member.role);

      if (!isSender && !isAdmin) {
        throw new Error('You can only delete your own messages or must be an admin');
      }

      // Soft delete the message
      message.isDeleted = true;
      message.deletedAt = new Date();
      message.content = '[Message deleted]';
      message.encryptedContent = await encryptionService.encryptMessage('[Message deleted]', group.encryptionKey);

      await this.saveMessagesToStorage();
    } catch (error) {
      throw new Error(`Failed to delete message: ${error}`);
    }
  }

  async addReaction(messageId: string, emoji: string): Promise<void> {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Find the message
      let message: Message | null = null;
      let groupId: string | null = null;

      for (const [id, messages] of this.messages.entries()) {
        const foundMessage = messages.find(m => m.id === messageId);
        if (foundMessage) {
          message = foundMessage;
          groupId = id;
          break;
        }
      }

      if (!message || !groupId) {
        throw new Error('Message not found');
      }

      // Check if user already reacted with this emoji
      const existingReaction = message.reactions.find(
        r => r.userId === currentUser.id && r.emoji === emoji
      );

      if (existingReaction) {
        // Remove the reaction
        message.reactions = message.reactions.filter(r => r !== existingReaction);
      } else {
        // Add the reaction
        message.reactions.push({
          userId: currentUser.id,
          emoji,
          timestamp: new Date(),
        });
      }

      await this.saveMessagesToStorage();
    } catch (error) {
      throw new Error(`Failed to add reaction: ${error}`);
    }
  }

  async clearGroupMessages(groupId: string): Promise<void> {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const group = await groupService.getGroupById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Check if user is admin
      const member = group.members.find(m => m.userId === currentUser.id);
      if (!member || member.role !== 'admin') {
        throw new Error('Only group admins can clear messages');
      }

      this.messages.set(groupId, []);
      await this.saveMessagesToStorage();
    } catch (error) {
      throw new Error(`Failed to clear group messages: ${error}`);
    }
  }

  private async saveMessagesToStorage(): Promise<void> {
    try {
      const messagesData = Array.from(this.messages.entries());
      await AsyncStorage.setItem('messages', JSON.stringify(messagesData));
    } catch (error) {
      console.error('Error saving messages to storage:', error);
    }
  }

  async loadMessagesFromStorage(): Promise<void> {
    try {
      const messagesData = await AsyncStorage.getItem('messages');
      if (messagesData) {
        const messagesArray = JSON.parse(messagesData);
        this.messages = new Map(messagesArray.map(([groupId, messages]: [string, any[]]) => [
          groupId,
          messages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
            editedAt: msg.editedAt ? new Date(msg.editedAt) : undefined,
            deletedAt: msg.deletedAt ? new Date(msg.deletedAt) : undefined,
            reactions: msg.reactions.map((r: any) => ({
              ...r,
              timestamp: new Date(r.timestamp),
            })),
          }))
        ]));
      }
    } catch (error) {
      console.error('Error loading messages from storage:', error);
    }
  }

  private generateMessageId(): string {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

export const messageService = MessageService.getInstance();
