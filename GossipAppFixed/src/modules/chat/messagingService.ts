/**
 * Messaging Service
 * Transient message bus using Firestore for real-time delivery only
 */

import firestore from '@react-native-firebase/firestore';
import { TransientMessage, LocalMessage, AnonId } from '../../types';
import { APP_ID } from '../../config/firebase';

const db = firestore();

// TTL values
const TTL = {
  MESSAGE: 10_000, // 10 seconds
  VOICE_SESSION: 60_000, // 60 seconds
};

/**
 * Send a message to a group or DM
 * Message is written to Firestore and immediately scheduled for deletion
 */
export const sendMessage = async (
  message: Omit<TransientMessage, 'id' | 'timestamp' | '_ttl'>
): Promise<string> => {
  const transientMessage: TransientMessage = {
    ...message,
    id: firestore().collection('_').doc().id,
    timestamp: Date.now(),
    _ttl: TTL.MESSAGE,
  };

  // Determine collection based on message target
  const collection = message.target.includes('__') 
    ? 'transient_dm' // DM channel
    : 'transient_messages'; // Group message

  const docRef = db.collection(collection).doc(transientMessage.id);
  await docRef.set(transientMessage);

  // Schedule deletion (client-side)
  setTimeout(async () => {
    try {
      await docRef.delete();
    } catch (error) {
      console.log('Message already deleted or expired:', error);
    }
  }, TTL.MESSAGE);

  return transientMessage.id;
};

/**
 * Listen to messages for a specific target (group or DM)
 * Returns unsubscribe function
 */
export const subscribeToMessages = (
  target: string,
  onMessage: (message: TransientMessage) => void,
  onError?: (error: Error) => void
): (() => void) => {
  const collection = target.includes('__') 
    ? 'transient_dm' 
    : 'transient_messages';

  const unsubscribe = db
    .collection(collection)
    .where('target', '==', target)
    .orderBy('timestamp', 'asc')
    .onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const message = {
              ...change.doc.data(),
              id: change.doc.id,
            } as TransientMessage;
            onMessage(message);
          }
        });
      },
      (error) => {
        console.error('Error subscribing to messages:', error);
        if (onError) {
          onError(error);
        }
      }
    );

  return unsubscribe;
};

/**
 * Delete a message immediately
 */
export const deleteMessage = async (messageId: string, isDM: boolean = false): Promise<void> => {
  const collection = isDM ? 'transient_dm' : 'transient_messages';
  await db.collection(collection).doc(messageId).delete();
};

/**
 * Send a text message
 */
export const sendTextMessage = async (
  senderAnonId: AnonId,
  target: string,
  content: string
): Promise<string> => {
  return sendMessage({
    senderAnonId,
    target,
    messageType: 'text',
    content,
  });
};

/**
 * Send a sticker message
 */
export const sendStickerMessage = async (
  senderAnonId: AnonId,
  target: string,
  stickerKey: string
): Promise<string> => {
  return sendMessage({
    senderAnonId,
    target,
    messageType: 'sticker',
    content: stickerKey,
    stickerKey,
  });
};

/**
 * Send a media message (photo/video as Base64)
 */
export const sendMediaMessage = async (
  senderAnonId: AnonId,
  target: string,
  base64Data: string,
  mediaType: 'photo' | 'video'
): Promise<string> => {
  return sendMessage({
    senderAnonId,
    target,
    messageType: 'media',
    content: base64Data,
    mediaType,
  });
};

