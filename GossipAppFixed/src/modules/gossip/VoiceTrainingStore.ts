import AsyncStorage from '@react-native-async-storage/async-storage';
import { GossipIntent } from './types';

const STORAGE_KEY = 'gossip_voice_training';
const MAX_PHRASES_PER_INTENT = 5;
const MATCH_THRESHOLD = 0.7;

interface TrainedPhrase {
  phrase: string;
  recordedAt: number;
}

type TrainingData = Partial<Record<GossipIntent, TrainedPhrase[]>>;

class VoiceTrainingStore {
  private data: TrainingData = {};
  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.data = JSON.parse(raw);
      }
      this.loaded = true;
    } catch (err) {
      console.warn('[VoiceTrainingStore] Failed to load:', err);
      this.loaded = true;
    }
  }

  getPhrasesForIntent(intent: GossipIntent): string[] {
    return (this.data[intent] || []).map(p => p.phrase);
  }

  async addPhrase(intent: GossipIntent, phrase: string): Promise<void> {
    const normalized = phrase.toLowerCase().trim();
    if (!normalized) return;

    if (!this.data[intent]) {
      this.data[intent] = [];
    }

    const existing = this.data[intent]!;

    // Don't add duplicates
    if (existing.some(p => p.phrase.toLowerCase() === normalized)) return;

    // Enforce max phrases
    if (existing.length >= MAX_PHRASES_PER_INTENT) {
      existing.shift(); // Remove oldest
    }

    existing.push({ phrase: normalized, recordedAt: Date.now() });
    await this.save();
  }

  async removePhrase(intent: GossipIntent, phrase: string): Promise<void> {
    const entries = this.data[intent];
    if (!entries) return;

    const normalized = phrase.toLowerCase().trim();
    this.data[intent] = entries.filter(p => p.phrase.toLowerCase() !== normalized);

    if (this.data[intent]!.length === 0) {
      delete this.data[intent];
    }

    await this.save();
  }

  async clearIntent(intent: GossipIntent): Promise<void> {
    delete this.data[intent];
    await this.save();
  }

  async clearAll(): Promise<void> {
    this.data = {};
    await this.save();
  }

  getAllTraining(): TrainingData {
    return { ...this.data };
  }

  /**
   * Fuzzy-match input text against all trained phrases.
   * Uses word-overlap scoring: matchedWords / max(inputWords, phraseWords).
   * Returns the best match above the threshold, or null.
   */
  matchInput(text: string): { intent: GossipIntent; confidence: number } | null {
    const inputWords = text.toLowerCase().trim().split(/\s+/);
    let bestIntent: GossipIntent | null = null;
    let bestConfidence = 0;

    for (const [intent, phrases] of Object.entries(this.data) as [GossipIntent, TrainedPhrase[]][]) {
      if (!phrases || phrases.length === 0) continue;

      for (const entry of phrases) {
        const phraseWords = entry.phrase.split(/\s+/);
        let matched = 0;

        for (const pw of phraseWords) {
          if (inputWords.includes(pw)) {
            matched++;
          }
        }

        const confidence = matched / Math.max(inputWords.length, phraseWords.length);

        if (confidence > bestConfidence) {
          bestConfidence = confidence;
          bestIntent = intent;
        }
      }
    }

    if (bestIntent && bestConfidence >= MATCH_THRESHOLD) {
      return { intent: bestIntent, confidence: bestConfidence };
    }

    return null;
  }

  private async save(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (err) {
      console.warn('[VoiceTrainingStore] Failed to save:', err);
    }
  }
}

export const voiceTrainingStore = new VoiceTrainingStore();
