import {
  FriendProfile,
  ConversationAnalysis,
  ReplySuggestion,
  PersonalityTrait,
  Emotion,
} from './types';
import { detectEmotion } from './EmotionDetector';
import { extractTopic } from './TopicExtractor';
import { generateSuggestions } from './ResponseGenerator';

function detectIntent(text: string): string {
  const lower = text.toLowerCase();
  if (/\b(hi|hey|hello|sup|what'?s up|yo)\b/i.test(lower)) return 'greeting';
  if (/\?/.test(text)) return 'question';
  if (/heard|apparently|did you know|rumor|secret|tea|drama/i.test(lower)) return 'gossip';
  return 'statement';
}

function detectTone(emotion: Emotion, sarcasm: boolean): string {
  if (sarcasm) return 'sarcastic';
  switch (emotion) {
    case 'excitement': return 'enthusiastic';
    case 'anger': return 'frustrated';
    case 'curiosity': return 'inquisitive';
    case 'amusement': return 'playful';
    case 'surprise': return 'shocked';
    default: return 'casual';
  }
}

function getSpeechStyle(messages: string[]): string[] {
  if (messages.length === 0) return [];

  const styles: string[] = [];
  const avgLength = messages.reduce((sum, m) => sum + m.length, 0) / messages.length;

  if (avgLength < 20) styles.push('short_messages');
  else if (avgLength > 80) styles.push('long_messages');

  const questionRatio = messages.filter(m => m.includes('?')).length / messages.length;
  if (questionRatio > 0.3) styles.push('rhetorical_questions');

  const emojiPattern = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  const emojiRatio = messages.filter(m => emojiPattern.test(m)).length / messages.length;
  if (emojiRatio > 0.3) styles.push('emoji_heavy');

  const capsRatio = messages.filter(m => {
    const words = m.replace(/[^a-zA-Z\s]/g, '').trim().split(/\s+/);
    return words.filter(w => w.length > 1 && w === w.toUpperCase()).length >= 2;
  }).length / messages.length;
  if (capsRatio > 0.2) styles.push('caps_shouter');

  const exclamRatio = messages.filter(m => /!{2,}/.test(m)).length / messages.length;
  if (exclamRatio > 0.3) styles.push('exclamation_heavy');

  return styles;
}

class PersonalityEngine {
  private profiles: Map<string, FriendProfile> = new Map();
  private analysisHistory: ConversationAnalysis[] = [];
  private messageHistory: Map<string, string[]> = new Map();

  analyzeMessage(senderId: string, senderName: string, text: string): ConversationAnalysis {
    const emotionResult = detectEmotion(text);
    const topicResult = extractTopic(text);
    const intent = detectIntent(text);
    const tone = detectTone(emotionResult.emotion, emotionResult.sarcasm);

    const analysis: ConversationAnalysis = {
      speakerId: senderId,
      text,
      intent,
      topic: topicResult.topic,
      emotion: emotionResult.emotion,
      sarcasm: emotionResult.sarcasm,
      tone,
      confidence: emotionResult.confidence,
      timestamp: Date.now(),
    };

    this.analysisHistory.push(analysis);
    this.updateProfile(senderId, senderName, analysis, text);

    return analysis;
  }

  private updateProfile(
    senderId: string,
    senderName: string,
    analysis: ConversationAnalysis,
    rawText: string,
  ): void {
    let profile = this.profiles.get(senderId);

    if (!profile) {
      profile = {
        id: senderId,
        name: senderName,
        conversationCount: 0,
        topics: new Map(),
        personalityTraits: new Map(),
        speechStyle: [],
        emotionDistribution: new Map(),
        lastUpdated: Date.now(),
      };
    }

    profile.conversationCount++;
    profile.lastUpdated = Date.now();

    // Update topics
    const currentCount = profile.topics.get(analysis.topic) || 0;
    profile.topics.set(analysis.topic, currentCount + 1);

    // Update emotion distribution
    const totalMessages = profile.conversationCount;
    for (const emotion of ['excitement', 'sarcasm', 'anger', 'curiosity', 'surprise', 'amusement', 'neutral'] as Emotion[]) {
      const current = profile.emotionDistribution.get(emotion) || 0;
      const detected = analysis.emotion === emotion ? 1 : 0;
      profile.emotionDistribution.set(emotion, current + (detected - current) / totalMessages);
    }

    // Update personality traits with exponential moving average
    this.updateTrait(profile, 'sarcastic', analysis.sarcasm ? 1 : 0);
    this.updateTrait(profile, 'curious', analysis.intent === 'question' ? 1 : 0);
    this.updateTrait(profile, 'dramatic', analysis.emotion === 'excitement' || analysis.emotion === 'anger' ? 1 : 0);
    this.updateTrait(profile, 'supportive', /hope|care|love you|proud|great job/i.test(rawText) ? 1 : 0);
    this.updateTrait(profile, 'secretive', analysis.intent === 'gossip' ? 1 : 0);
    this.updateTrait(profile, 'skeptical', /doubt|don't think|unlikely|not sure about/i.test(rawText) ? 1 : 0);

    // Track messages for speech style analysis
    const messages = this.messageHistory.get(senderId) || [];
    messages.push(rawText);
    this.messageHistory.set(senderId, messages);
    profile.speechStyle = getSpeechStyle(messages);

    this.profiles.set(senderId, profile);
  }

  private updateTrait(profile: FriendProfile, trait: PersonalityTrait, detected: number): void {
    const current = profile.personalityTraits.get(trait) || 0;
    const updated = current * 0.9 + detected * 0.1;
    profile.personalityTraits.set(trait, updated);
  }

  getProfile(speakerId: string): FriendProfile | undefined {
    return this.profiles.get(speakerId);
  }

  getAllProfiles(): FriendProfile[] {
    return Array.from(this.profiles.values());
  }

  getSuggestions(analysis: ConversationAnalysis): ReplySuggestion[] {
    const profile = this.profiles.get(analysis.speakerId);
    return generateSuggestions(analysis, profile);
  }
}

export const personalityEngine = new PersonalityEngine();
export default PersonalityEngine;
