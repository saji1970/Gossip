/**
 * Message Types
 * Transient messages - Server storage only for real-time delivery
 */

import { AnonId } from './User';

export type MessageType = 'text' | 'media' | 'voice' | 'sticker';

export interface TransientMessage {
  id: string;
  senderAnonId: AnonId;
  target: string; // groupId or DM channelId
  messageType: MessageType;
  content: string; // Text or Base64 for media/audio
  timestamp: number;
  _ttl?: number; // Time-to-live in milliseconds
  mediaType?: 'photo' | 'video'; // For media messages
  stickerKey?: string; // For sticker messages
}

export interface LocalMessage extends TransientMessage {
  // Client-side storage fields
  localId: string;
  isSavedLocally: boolean;
  deliveryStatus: 'sending' | 'sent' | 'failed';
}

export interface VoiceSession {
  sessionId: string;
  participants: AnonId[];
  signal: any; // SDP/ICE payloads
  createdAt: number;
  _ttl: number;
}

// DM Channel ID format: sorted concatenation of two anonIds
export type DMChannelId = string; // `${min(anonA,anonB)}__${max(anonA,anonB)}`

