import AsyncStorage from '@react-native-async-storage/async-storage';
import { LearnedMapping, GossipIntent, ExtractedEntity } from './types';

const STORAGE_KEY = 'gossip_bot_learned_mappings';
const MAX_MAPPINGS = 200;

class LearningStore {
  private mappings: LearnedMapping[] = [];
  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.mappings = JSON.parse(raw);
      }
      this.loaded = true;
    } catch (err) {
      console.warn('[LearningStore] Failed to load:', err);
      this.loaded = true;
    }
  }

  async recordResolution(
    rawText: string,
    intent: GossipIntent,
    entities: ExtractedEntity[],
  ): Promise<void> {
    const normalized = rawText.toLowerCase().trim();
    const existing = this.mappings.find(m => m.pattern === normalized);

    if (existing) {
      existing.intent = intent;
      existing.entities = entities;
      existing.usageCount += 1;
      existing.lastUsed = Date.now();
    } else {
      this.mappings.push({
        pattern: normalized,
        intent,
        entities,
        usageCount: 1,
        lastUsed: Date.now(),
      });
    }

    // Prune if over cap: remove oldest low-usage entries
    if (this.mappings.length > MAX_MAPPINGS) {
      this.mappings.sort((a, b) => {
        // Keep high-usage entries; break ties by recency
        if (a.usageCount !== b.usageCount) return b.usageCount - a.usageCount;
        return b.lastUsed - a.lastUsed;
      });
      this.mappings = this.mappings.slice(0, MAX_MAPPINGS);
    }

    await this.save();
  }

  findMatch(rawText: string): LearnedMapping | null {
    const normalized = rawText.toLowerCase().trim();
    return this.mappings.find(m => m.pattern === normalized) || null;
  }

  private async save(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.mappings));
    } catch (err) {
      console.warn('[LearningStore] Failed to save:', err);
    }
  }
}

export const learningStore = new LearningStore();
