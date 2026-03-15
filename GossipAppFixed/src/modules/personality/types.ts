// Personality Learning Engine — Data Models

export type PersonalityTrait =
  | 'sarcastic'
  | 'curious'
  | 'dramatic'
  | 'secretive'
  | 'supportive'
  | 'skeptical';

export type Emotion =
  | 'excitement'
  | 'sarcasm'
  | 'anger'
  | 'curiosity'
  | 'surprise'
  | 'amusement'
  | 'neutral';

export type TopicCategory = string;

export interface FriendProfile {
  id: string;
  name: string;
  conversationCount: number;
  topics: Map<string, number>;
  personalityTraits: Map<PersonalityTrait, number>;
  speechStyle: string[];
  emotionDistribution: Map<Emotion, number>;
  lastUpdated: number;
}

export interface ConversationAnalysis {
  speakerId: string;
  text: string;
  intent: string;
  topic: string;
  emotion: Emotion;
  sarcasm: boolean;
  tone: string;
  confidence: number;
  timestamp: number;
}

export interface ReplySuggestion {
  text: string;
  emoji?: string;
  tone: string;
}

export interface EmotionResult {
  emotion: Emotion;
  confidence: number;
  sarcasm: boolean;
}

export interface TopicResult {
  topic: string;
  category: string;
}
