/**
 * User Profile Types
 * Zero-PII Architecture - Only anonymous identifiers
 */

export type AnonId = string; // UUID v4

export interface UserProfile {
  anonId: AnonId;
  avatar: string; // Avatar ID
  displayName?: string; // Optional pseudonym
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say'; // Optional gender
  status?: string; // Optional status message
  phoneNumber?: string; // Optional phone number for invites
  lastActive?: number; // Timestamp for presence (not chat history)
}

export interface LocalUserState extends UserProfile {
  // Client-side only state
  createdAt: number;
  hasCompletedSetup: boolean;
  username?: string; // Username for login
  email?: string; // Email for login
}

