/**
 * GossipIn - Data Models
 * Zero-PII, Anonymous Gossiping App
 */

export type AnonId = string; // UUID v4

export type MessageType = 'text' | 'media' | 'voice' | 'sticker';

export type GroupType = 'public' | 'private';

export type MemberRole = 'creator' | 'moderator' | 'member';

/**
 * User Profile (Local + Minimal Firestore)
 * No PII - only anonymous ID, avatar, and optional pseudonym
 */
export interface UserProfile {
  anonId: AnonId;
  avatar: string; // emoji or icon key
  displayName?: string; // optional pseudonym
  status?: string; // optional status message
  phoneNumber?: string; // optional phone number for invites
  lastActive?: number;
  createdAt: number;
}

/**
 * Group Metadata (Firestore)
 * Path: /artifacts/{appId}/public/data/groups/{groupId}
 */
export interface Group {
  groupId: string;
  groupName: string;
  type: GroupType;
  creatorAnonId: AnonId;
  rules: string; // Markdown/text rules
  termsAndConditions: string;
  memberAnonIds: AnonId[];
  moderators: AnonId[]; // subset of memberAnonIds
  avatar?: string; // group avatar emoji
  createdAt: number;
  lastActivity?: number;
}

/**
 * Transient Message (Firestore - Auto-deleted)
 * Path: /transient/messages/{messageId} OR /transient/dm/{channelId}/{messageId}
 * TTL: 10 seconds (deleted by sender or cleanup function)
 */
export interface TransientMessage {
  id: string;
  senderAnonId: AnonId;
  target: string; // groupId or channelId (for DM)
  messageType: MessageType;
  content: string; // text or Base64 media/audio blob
  timestamp: number; // ms since epoch
  _ttl?: number; // milliseconds before auto-delete
  replyTo?: string; // messageId being replied to
}

/**
 * Local Message (AsyncStorage)
 * Persistent client-side storage
 */
export interface LocalMessage extends TransientMessage {
  isRead: boolean;
  isSent: boolean;
  localId: string; // client-generated ID for optimistic updates
}

/**
 * Direct Message Channel ID
 * Format: sorted concatenation of two anonIds
 */
export interface DirectChannel {
  channelId: string; // `${min(anonA,anonB)}__${max(anonA,anonB)}`
  participantIds: [AnonId, AnonId];
  lastMessage?: LocalMessage;
  unreadCount: number;
}

/**
 * Voice Session (Transient Signaling)
 * Path: /transient/voice_sessions/{sessionId}
 * TTL: 60 seconds
 */
export interface VoiceSession {
  sessionId: string;
  participants: AnonId[];
  createdBy: AnonId;
  groupId?: string; // if group voice room
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  iceCandidates: RTCIceCandidateInit[];
  createdAt: number;
  _ttl?: number;
}

/**
 * Join Request (for private groups)
 */
export interface JoinRequest {
  requestId: string;
  groupId: string;
  requesterAnonId: AnonId;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: number;
  reviewedBy?: AnonId;
  reviewedAt?: number;
}

/**
 * Sticker Definition
 */
export interface Sticker {
  key: string;
  label: string;
  emoji: string;
}

/**
 * Local Chat History
 */
export interface ChatHistory {
  targetId: string; // groupId or channelId
  messages: LocalMessage[];
  lastFetched: number;
}

/**
 * App Metadata
 */
export interface AppMetadata {
  version: string;
  appId: string;
  lastSync: number;
}

