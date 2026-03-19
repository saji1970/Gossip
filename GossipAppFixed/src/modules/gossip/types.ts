import { VoiceCommand } from '../voice/VoiceCommandParser';
import { Group } from '../../utils/GroupStorage';

// ── Intents GossipBot can recognize ──

export type GossipIntent =
  | 'chat_with_person'
  | 'private_chat'
  | 'create_group'
  | 'call_group'
  | 'send_message'
  | 'query_groups'
  | 'query_members'
  | 'navigate'
  | 'help'
  | 'casual_chat'
  | 'show_groups'
  | 'settings_change'
  | 'unknown';

// ── Entity extraction ──

export type EntityType = 'person' | 'group' | 'message' | 'screen';

export interface ExtractedEntity {
  type: EntityType;
  value: string;
}

export interface IntentResult {
  intent: GossipIntent;
  entities: ExtractedEntity[];
  confidence: number;
  ambiguities: GossipIntent[];
}

// ── Search results ──

export interface MemberSearchResult {
  email: string;
  displayName: string;
  groups: { id: string; name: string }[];
  score: number;
}

export interface GroupSearchResult {
  group: Group;
  score: number;
}

// ── GossipBot context & responses ──

export interface GossipContext {
  user: { uid: string; email: string; displayName: string } | null;
  groups: Group[];
  currentScreen: string;
  currentGroup?: Group;
}

export interface GossipOption {
  label: string;
  description: string;
  command: VoiceCommand;
}

export type GossipResponseType = 'execute' | 'clarify' | 'info' | 'unknown';

export interface GossipResponse {
  type: GossipResponseType;
  message: string;
  options?: GossipOption[];
  command?: VoiceCommand;
}

// ── Conversation state ──

export interface PendingClarification {
  originalText: string;
  intent: GossipIntent;
  options: GossipOption[];
  createdAt: number;
  turnCount: number;
}

// ── Learning ──

export interface LearnedMapping {
  pattern: string;
  intent: GossipIntent;
  entities: ExtractedEntity[];
  usageCount: number;
  lastUsed: number;
}

// ── Conversation History ──

export type ConversationEntryRole = 'user' | 'gossip' | 'system';

export interface ConversationEntry {
  id: string;
  role: ConversationEntryRole;
  text: string;
  timestamp: number;
  options?: GossipOption[];
  actionType?: string;
}

// ── User Personality Profile ──

export interface UserPersonalityData {
  avgMessageLength: number;
  emojiUsageRate: number;
  slangUsageRate: number;
  formalityScore: number;
  verbosityScore: number;
  questionRate: number;
  frequentContacts: Record<string, number>;
  frequentCommands: Record<string, number>;
  activeHours: number[];
  totalInteractions: number;
}

export type UserCommunicationStyle = 'formal' | 'casual' | 'terse' | 'verbose';

// ── Gossip Personality ──

export type GossipMood = 'chill' | 'hyped' | 'sassy' | 'supportive' | 'curious';

export interface GossipStyleWeights {
  genZ: number;
  warm: number;
  witty: number;
  efficient: number;
  playful: number;
}

export interface GossipPersonalityData {
  currentMood: GossipMood;
  styleWeights: GossipStyleWeights;
  greetingScores: Record<string, { positive: number; total: number }>;
  fillerScores: Record<string, { positive: number; total: number }>;
  totalResponses: number;
}
