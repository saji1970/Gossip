import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserPersonalityData, UserCommunicationStyle, GossipIntent } from './types';

const STORAGE_KEY = 'gossip_user_personality';
const EMA_ALPHA = 0.1; // exponential moving average smoothing

const SLANG_KEYWORDS = [
  'fr', 'ngl', 'tbh', 'no cap', 'bet', 'slay', 'fire', 'goat', 'rizz',
  'bussin', 'frfr', 'bffr', 'smh', 'npc', 'ftw', 'bruh', 'yo', 'ayo',
  'lowkey', 'highkey', 'fam', 'vibe', 'vibes', 'cap', 'sus', 'gg',
  'lit', 'finna', 'deadass', 'simp', 'stan', 'salty', 'tea', 'oof',
];

const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2702}-\u{27B0}\u{24C2}-\u{1F251}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2300}-\u{23FF}]/gu;

const FORMAL_MARKERS = [
  'please', 'thank you', 'could you', 'would you', 'kindly', 'appreciate',
  'sincerely', 'regards', 'hello', 'greetings', 'excuse me',
];

function getDefaultProfile(): UserPersonalityData {
  return {
    avgMessageLength: 20,
    emojiUsageRate: 0,
    slangUsageRate: 0,
    formalityScore: 0.5,
    verbosityScore: 0.5,
    questionRate: 0.3,
    frequentContacts: {},
    frequentCommands: {},
    activeHours: new Array(24).fill(0),
    totalInteractions: 0,
  };
}

class UserPersonalityProfile {
  private profile: UserPersonalityData = getDefaultProfile();
  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.profile = { ...getDefaultProfile(), ...JSON.parse(raw) };
      }
      this.loaded = true;
    } catch (err) {
      console.warn('[UserPersonalityProfile] Failed to load:', err);
      this.loaded = true;
    }
  }

  analyzeInput(text: string): void {
    const lower = text.toLowerCase();
    const words = lower.split(/\s+/).filter(Boolean);

    // Message length
    const length = text.length;
    this.profile.avgMessageLength =
      this.profile.avgMessageLength * (1 - EMA_ALPHA) + length * EMA_ALPHA;

    // Emoji rate
    const emojiMatches = text.match(EMOJI_REGEX) || [];
    const emojiRate = words.length > 0 ? emojiMatches.length / words.length : 0;
    this.profile.emojiUsageRate =
      this.profile.emojiUsageRate * (1 - EMA_ALPHA) + emojiRate * EMA_ALPHA;

    // Slang rate
    let slangCount = 0;
    for (const kw of SLANG_KEYWORDS) {
      if (lower.includes(kw)) slangCount++;
    }
    const slangRate = words.length > 0 ? slangCount / words.length : 0;
    this.profile.slangUsageRate =
      this.profile.slangUsageRate * (1 - EMA_ALPHA) + slangRate * EMA_ALPHA;

    // Formality
    let formalCount = 0;
    for (const marker of FORMAL_MARKERS) {
      if (lower.includes(marker)) formalCount++;
    }
    const formalDetected = formalCount > 0 ? 1 : 0;
    this.profile.formalityScore =
      this.profile.formalityScore * (1 - EMA_ALPHA) + formalDetected * EMA_ALPHA;

    // Verbosity (normalized 0-1 by length / 100, capped)
    const verbosity = Math.min(length / 100, 1);
    this.profile.verbosityScore =
      this.profile.verbosityScore * (1 - EMA_ALPHA) + verbosity * EMA_ALPHA;

    // Question rate
    const isQuestion = text.includes('?') ? 1 : 0;
    this.profile.questionRate =
      this.profile.questionRate * (1 - EMA_ALPHA) + isQuestion * EMA_ALPHA;

    // Active hours
    const hour = new Date().getHours();
    this.profile.activeHours[hour] = (this.profile.activeHours[hour] || 0) + 1;

    this.profile.totalInteractions++;
    this.save();
  }

  recordCommandUsage(intent: GossipIntent): void {
    this.profile.frequentCommands[intent] =
      (this.profile.frequentCommands[intent] || 0) + 1;
    this.save();
  }

  recordContactInteraction(name: string): void {
    const key = name.toLowerCase();
    this.profile.frequentContacts[key] =
      (this.profile.frequentContacts[key] || 0) + 1;
    this.save();
  }

  getProfile(): UserPersonalityData {
    return { ...this.profile };
  }

  getCommunicationStyle(): UserCommunicationStyle {
    if (this.profile.formalityScore > 0.5) return 'formal';
    if (this.profile.avgMessageLength < 15) return 'terse';
    if (this.profile.verbosityScore > 0.6) return 'verbose';
    return 'casual';
  }

  private async save(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
    } catch (err) {
      console.warn('[UserPersonalityProfile] Failed to save:', err);
    }
  }
}

export const userPersonalityProfile = new UserPersonalityProfile();
