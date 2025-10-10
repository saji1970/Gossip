/**
 * Transient Messaging Service
 * Handles ephemeral message delivery via Firestore
 * Messages are written, delivered, and immediately deleted
 * Updated for React Native Firebase
 */

import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS, TTL } from '../config/firebase';
import { TransientMessage, LocalMessage, MessageType, AnonId } from '../types/models';
import LocalStorageService from './LocalStorageService';
import AuthService from './AuthService';

class TransientMessagingService {
  private activeListeners: Map<string, () => void> = new Map();

  /**
   * Send a transient message
   * Message is written to Firestore and scheduled for deletion
   */
  async sendMessage(
    target: string,
    messageType: MessageType,
    content: string,
    options?: { replyTo?: string; ttl?: number }
  ): Promise<string> {
    const senderAnonId = AuthService.getCurrentAnonId();

    if (!senderAnonId) {
      throw new Error('Not authenticated');
    }

    // Create transient message
    const transientMessage: Omit<TransientMessage, 'id'> = {
      senderAnonId,
      target,
      messageType,
      content,
      timestamp: Date.now(),
      _ttl: options?.ttl || TTL.MESSAGE,
      replyTo: options?.replyTo,
    };

    // Determine collection path
    let collectionRef;
    if (target.includes('__')) {
      // DM channel
      collectionRef = firestore()
        .collection(COLLECTIONS.TRANSIENT_DM)
        .doc(target)
        .collection('messages');
    } else {
      // Group message
      collectionRef = firestore().collection(COLLECTIONS.TRANSIENT_MESSAGES);
    }

    // Write to Firestore
    const docRef = await collectionRef.add(transientMessage);

    // Save locally
    const localMessage: LocalMessage = {
      ...transientMessage,
      id: docRef.id,
      localId: `${Date.now()}-${Math.random()}`,
      isRead: true,
      isSent: true,
    };

    await LocalStorageService.addMessage(target, localMessage);

    // Schedule deletion after TTL
    this.scheduleMessageDeletion(docRef, transientMessage._ttl);

    return docRef.id;
  }

  /**
   * Listen for incoming messages
   * Saves messages locally and deletes from Firestore
   */
  listenToMessages(
    target: string,
    onMessage: (message: LocalMessage) => void,
    onError?: (error: Error) => void
  ): () => void {
    const currentAnonId = AuthService.getCurrentAnonId();

    if (!currentAnonId) {
      throw new Error('Not authenticated');
    }

    // Determine collection path
    let query;
    if (target.includes('__')) {
      // DM channel
      query = firestore()
        .collection(COLLECTIONS.TRANSIENT_DM)
        .doc(target)
        .collection('messages')
        .orderBy('timestamp', 'desc')
        .limit(50);
    } else {
      // Group messages
      query = firestore()
        .collection(COLLECTIONS.TRANSIENT_MESSAGES)
        .where('target', '==', target)
        .orderBy('timestamp', 'desc')
        .limit(50);
    }

    // Set up listener
    const unsubscribe = query.onSnapshot(
      async (snapshot) => {
        for (const change of snapshot.docChanges()) {
          if (change.type === 'added') {
            const data = change.doc.data() as Omit<TransientMessage, 'id'>;

            // Skip own messages (already saved locally when sent)
            if (data.senderAnonId === currentAnonId) {
              continue;
            }

            // Create local message
            const localMessage: LocalMessage = {
              ...data,
              id: change.doc.id,
              localId: `${Date.now()}-${Math.random()}`,
              isRead: false,
              isSent: true,
            };

            // Save locally
            await LocalStorageService.addMessage(target, localMessage);

            // Notify callback
            onMessage(localMessage);

            // Delete from Firestore
            try {
              await change.doc.ref.delete();
            } catch (error) {
              console.error('Failed to delete transient message:', error);
            }
          }
        }
      },
      (error) => {
        console.error('Message listener error:', error);
        onError?.(error);
      }
    );

    // Store unsubscribe function
    this.activeListeners.set(target, unsubscribe);

    return unsubscribe;
  }

  /**
   * Stop listening to messages
   */
  stopListening(target: string): void {
    const unsubscribe = this.activeListeners.get(target);
    if (unsubscribe) {
      unsubscribe();
      this.activeListeners.delete(target);
    }
  }

  /**
   * Stop all listeners
   */
  stopAllListeners(): void {
    this.activeListeners.forEach((unsubscribe) => unsubscribe());
    this.activeListeners.clear();
  }

  /**
   * Schedule message deletion
   * Deletes message from Firestore after TTL expires
   */
  private scheduleMessageDeletion(
    docRef: any,
    ttl: number = TTL.MESSAGE
  ): void {
    setTimeout(async () => {
      try {
        await docRef.delete();
      } catch (error) {
        // Message might already be deleted by receiver
        console.log('Message already deleted:', docRef.id);
      }
    }, ttl);
  }

  /**
   * Mark message as read
   */
  async markAsRead(target: string, messageId: string): Promise<void> {
    const history = await LocalStorageService.getChatHistory(target);
    if (!history) return;

    const messages = history.messages.map((msg) =>
      msg.id === messageId ? { ...msg, isRead: true } : msg
    );

    await LocalStorageService.saveChatHistory(target, messages);
  }

  /**
   * Mark all messages as read for a target
   */
  async markAllAsRead(target: string): Promise<void> {
    const history = await LocalStorageService.getChatHistory(target);
    if (!history) return;

    const messages = history.messages.map((msg) => ({ ...msg, isRead: true }));
    await LocalStorageService.saveChatHistory(target, messages);
  }

  /**
   * Get unread count for a target
   */
  async getUnreadCount(target: string): Promise<number> {
    const history = await LocalStorageService.getChatHistory(target);
    if (!history) return 0;

    return history.messages.filter(
      (msg) =>
        !msg.isRead && msg.senderAnonId !== AuthService.getCurrentAnonId()
    ).length;
  }
}

export default new TransientMessagingService();
