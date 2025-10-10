/**
 * Cloud Functions for GossipIn
 * Cleanup transient documents that exceed TTL
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const db = admin.firestore();

/**
 * Cleanup Transient Documents
 * Runs every 1 minute to delete expired transient messages
 */
export const cleanupTransientDocs = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async (context) => {
    const now = Date.now();
    
    console.log('Starting transient document cleanup at', new Date(now));

    // Cleanup function for a collection
    const sweepCollection = async (
      collectionPath: string,
      defaultTTL: number
    ): Promise<number> => {
      const snapshot = await db.collection(collectionPath).get();
      
      if (snapshot.empty) {
        return 0;
      }

      const batch = db.batch();
      let deletedCount = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const ttl = typeof data._ttl === 'number' ? data._ttl : defaultTTL;
        const timestamp = data.timestamp || data.createdAt || 0;

        // Delete if expired
        if (timestamp + ttl < now) {
          batch.delete(doc.ref);
          deletedCount++;
        }
      });

      if (deletedCount > 0) {
        await batch.commit();
        console.log(`Deleted ${deletedCount} docs from ${collectionPath}`);
      }

      return deletedCount;
    };

    // Sweep DM channels
    const sweepDMChannels = async (): Promise<number> => {
      const dmChannels = await db.collection('transient/dm').listCollections();
      let totalDeleted = 0;

      for (const channelRef of dmChannels) {
        const messages = await channelRef.listCollections();
        for (const messagesRef of messages) {
          const deleted = await sweepCollection(messagesRef.path, 10_000);
          totalDeleted += deleted;
        }
      }

      return totalDeleted;
    };

    try {
      // Sweep all transient collections
      const [messagesDeleted, dmDeleted, voiceDeleted] = await Promise.all([
        sweepCollection('transient/messages', 10_000), // 10 seconds
        sweepDMChannels(),
        sweepCollection('transient/voice_sessions', 60_000), // 60 seconds
      ]);

      const totalDeleted = messagesDeleted + dmDeleted + voiceDeleted;
      
      console.log('Cleanup complete:', {
        messages: messagesDeleted,
        dm: dmDeleted,
        voice: voiceDeleted,
        total: totalDeleted,
      });

      return null;
    } catch (error) {
      console.error('Cleanup error:', error);
      return null;
    }
  });

/**
 * Update Group Last Activity
 * Triggered when a message is sent to a group
 */
export const updateGroupActivity = functions.firestore
  .document('transient/messages/{messageId}')
  .onCreate(async (snapshot, context) => {
    const message = snapshot.data();
    
    if (!message || !message.target) {
      return null;
    }

    // Check if target is a group (not a DM channel)
    if (message.target.includes('__')) {
      return null; // Skip DM channels
    }

    try {
      const groupRef = db.doc(`artifacts/gossipin-v1/public/data/groups/${message.target}`);
      await groupRef.update({
        lastActivity: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Failed to update group activity:', error);
    }

    return null;
  });

/**
 * Auto-delete transient message after creation
 * Backup deletion in case client-side deletion fails
 */
export const autoDeleteTransientMessage = functions.firestore
  .document('transient/messages/{messageId}')
  .onCreate(async (snapshot, context) => {
    const message = snapshot.data();
    const ttl = message._ttl || 10_000;

    // Schedule deletion
    setTimeout(async () => {
      try {
        await snapshot.ref.delete();
        console.log('Auto-deleted message:', snapshot.id);
      } catch (error) {
        // Message may already be deleted by client
        console.log('Message already deleted:', snapshot.id);
      }
    }, ttl);

    return null;
  });

