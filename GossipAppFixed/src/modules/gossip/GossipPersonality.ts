import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GossipMood,
  GossipPersonalityData,
  GossipStyleWeights,
} from './types';

const STORAGE_KEY = 'gossip_bot_personality';
const EMA_ALPHA = 0.08;

type StyleKey = keyof GossipStyleWeights;

// ── Style-specific vocabulary pools ──

const STYLE_GREETINGS: Record<StyleKey, string[]> = {
  genZ: ['Yo', 'Ayy', 'Ayo', 'Yoo'],
  warm: ['Hey there', 'Hi!', 'Hello', 'Hey friend'],
  witty: ['Well well well', 'Look who it is', 'Ah', 'So'],
  efficient: ['Hey', 'Hi'],
  playful: ['Heyyy', 'Wassup', 'Yooo', 'Hiya'],
};

const STYLE_FILLERS: Record<StyleKey, string[]> = {
  genZ: ['fr', 'ngl', 'tbh', 'no cap'],
  warm: ['honestly', 'truly', 'really'],
  witty: ['obviously', 'naturally', 'clearly'],
  efficient: [''],
  playful: ['lol', 'haha', 'btw', 'tho'],
};

const STYLE_AFFIRMATIONS: Record<StyleKey, string[]> = {
  genZ: ['bet', 'say less', 'gotchu', 'on it'],
  warm: ['of course', 'absolutely', 'sure thing', 'happy to help'],
  witty: ['consider it done', 'as you wish', 'your wish is my command'],
  efficient: ['done', 'ok', 'got it'],
  playful: ['okie dokie', 'you got it', 'let\'s gooo', 'on it boss'],
};

const MOOD_POOLS: GossipMood[] = ['chill', 'hyped', 'sassy', 'supportive', 'curious'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getDefaultPersonality(): GossipPersonalityData {
  return {
    currentMood: 'chill',
    styleWeights: {
      genZ: 0.1,
      warm: 0.35,
      witty: 0.15,
      efficient: 0.2,
      playful: 0.2,
    },
    greetingScores: {},
    fillerScores: {},
    totalResponses: 0,
  };
}

class GossipPersonality {
  private data: GossipPersonalityData = getDefaultPersonality();
  private loaded = false;
  private lastGreetingUsed = '';
  private lastFillerUsed = '';

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        // Migration: if genZ was dominant (old default), reset to new defaults
        if (saved.styleWeights && saved.styleWeights.genZ >= 0.3) {
          this.data = getDefaultPersonality();
          await this.save();
        } else {
          this.data = { ...getDefaultPersonality(), ...saved };
        }
      }
      this.loaded = true;
    } catch (err) {
      console.warn('[GossipPersonality] Failed to load:', err);
      this.loaded = true;
    }
  }

  getMood(): GossipMood {
    return this.data.currentMood;
  }

  /** Get a greeting weighted by dominant style and tracked scores. */
  getGreeting(): string {
    const style = this.getDominantStyle();
    const pool = STYLE_GREETINGS[style];
    const greeting = this.weightedPick(pool, this.data.greetingScores);
    this.lastGreetingUsed = greeting;
    return greeting;
  }

  /** Get a filler word weighted by dominant style. */
  getFiller(): string {
    const style = this.getDominantStyle();
    const pool = STYLE_FILLERS[style];
    const filler = this.weightedPick(pool, this.data.fillerScores);
    this.lastFillerUsed = filler;
    return filler;
  }

  /** Get an affirmation phrase. */
  getAffirmation(): string {
    const style = this.getDominantStyle();
    return pick(STYLE_AFFIRMATIONS[style]);
  }

  /** Record user reaction to adapt style weights. */
  recordExchange(userFollowedUp: boolean, wasPositive: boolean): void {
    this.data.totalResponses++;

    // Update greeting/filler effectiveness scores
    if (this.lastGreetingUsed) {
      const gs = this.data.greetingScores[this.lastGreetingUsed] ||
        { positive: 0, total: 0 };
      gs.total++;
      if (wasPositive) gs.positive++;
      this.data.greetingScores[this.lastGreetingUsed] = gs;
    }

    if (this.lastFillerUsed) {
      const fs = this.data.fillerScores[this.lastFillerUsed] ||
        { positive: 0, total: 0 };
      fs.total++;
      if (wasPositive) fs.positive++;
      this.data.fillerScores[this.lastFillerUsed] = fs;
    }

    // Shift style weights based on user reaction
    if (!wasPositive) {
      // User frustrated → shift toward efficient
      this.shiftWeight('efficient', 0.03);
    } else if (userFollowedUp) {
      // User engaged → reinforce current dominant style
      const dominant = this.getDominantStyle();
      this.shiftWeight(dominant, 0.02);
    }

    // Occasionally shift mood
    if (this.data.totalResponses % 5 === 0) {
      this.evolveMood(wasPositive);
    }

    this.save();
  }

  /** Detect frustration signals in user text. */
  detectFrustration(text: string): boolean {
    const lower = text.toLowerCase();
    const frustrationSignals = [
      'just do it', 'stop', 'enough', 'ugh', 'bruh', 'come on',
      'never mind', 'forget it', 'whatever', 'i said',
    ];
    return frustrationSignals.some(s => lower.includes(s));
  }

  /** Detect positive engagement in user text. */
  detectPositive(text: string): boolean {
    const lower = text.toLowerCase();
    const positiveSignals = [
      'lol', 'haha', 'thanks', 'nice', 'cool', 'awesome', 'perfect',
      'great', 'love it', 'yes', 'yeah', 'yep',
    ];
    return positiveSignals.some(s => lower.includes(s));
  }

  getStyleConfig(): { dominant: StyleKey; weights: GossipStyleWeights } {
    return {
      dominant: this.getDominantStyle(),
      weights: { ...this.data.styleWeights },
    };
  }

  private getDominantStyle(): StyleKey {
    const w = this.data.styleWeights;
    let best: StyleKey = 'genZ';
    let bestVal = 0;
    for (const key of Object.keys(w) as StyleKey[]) {
      if (w[key] > bestVal) {
        bestVal = w[key];
        best = key;
      }
    }
    return best;
  }

  /** Shift weight toward a style, normalizing to sum=1. */
  private shiftWeight(target: StyleKey, amount: number): void {
    const w = this.data.styleWeights;
    const keys = Object.keys(w) as StyleKey[];
    const numOthers = keys.length - 1;

    w[target] = Math.min(0.6, w[target] + amount);
    const redistributeEach = amount / numOthers;
    for (const key of keys) {
      if (key !== target) {
        w[key] = Math.max(0.05, w[key] - redistributeEach);
      }
    }

    // Renormalize
    const sum = keys.reduce((s, k) => s + w[k], 0);
    for (const key of keys) {
      w[key] = w[key] / sum;
    }
  }

  private evolveMood(wasPositive: boolean): void {
    if (wasPositive) {
      const upMoods: GossipMood[] = ['hyped', 'supportive', 'playful' as GossipMood];
      this.data.currentMood = pick(upMoods.filter(m => MOOD_POOLS.includes(m)));
    } else {
      const downMoods: GossipMood[] = ['chill', 'sassy'];
      this.data.currentMood = pick(downMoods);
    }
  }

  /** Pick from pool, weighted by positive score history. */
  private weightedPick(
    pool: string[],
    scores: Record<string, { positive: number; total: number }>,
  ): string {
    if (pool.length === 0) return '';
    // Build weights: base 1.0 + success ratio
    const weights = pool.map(item => {
      const s = scores[item];
      if (!s || s.total === 0) return 1.0;
      return 1.0 + (s.positive / s.total);
    });
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalWeight;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  private async save(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (err) {
      console.warn('[GossipPersonality] Failed to save:', err);
    }
  }
}

export const gossipPersonality = new GossipPersonality();
