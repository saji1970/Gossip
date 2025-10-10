/**
 * Group Types
 * Minimal metadata storage - No PII, No message history
 */

import { AnonId } from './User';

export type GroupType = 'public' | 'private';

export interface Group {
  groupId: string;
  groupName: string;
  type: GroupType;
  creatorAnonId: AnonId;
  rules: string; // Markdown/text rules
  termsAndConditions: string;
  memberAnonIds: AnonId[];
  moderators: AnonId[]; // Moderators can approve joins, invite
  createdAt: number;
  lastActivity?: number;
}

export interface JoinRequest {
  requestId: string;
  groupId: string;
  requesterAnonId: AnonId;
  timestamp: number;
  status: 'pending' | 'approved' | 'rejected';
}

