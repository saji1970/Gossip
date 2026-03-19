import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConversationEntry, ConversationEntryRole, GossipOption } from './types';

const STORAGE_KEY = 'gossip_conversation_history';
const MAX_ENTRIES = 500;

let idCounter = 0;

function generateId(): string {
  idCounter++;
  return `msg_${Date.now()}_${idCounter}`;
}

class ConversationHistory {
  private entries: ConversationEntry[] = [];
  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.entries = JSON.parse(raw);
      }
      this.loaded = true;
    } catch (err) {
      console.warn('[ConversationHistory] Failed to load:', err);
      this.loaded = true;
    }
  }

  addUserMessage(text: string): ConversationEntry {
    return this.addEntry('user', text);
  }

  addGossipMessage(text: string, options?: GossipOption[]): ConversationEntry {
    return this.addEntry('gossip', text, options);
  }

  addSystemMessage(text: string, actionType?: string): ConversationEntry {
    return this.addEntry('system', text, undefined, actionType);
  }

  private addEntry(
    role: ConversationEntryRole,
    text: string,
    options?: GossipOption[],
    actionType?: string,
  ): ConversationEntry {
    const entry: ConversationEntry = {
      id: generateId(),
      role,
      text,
      timestamp: Date.now(),
      options,
      actionType,
    };
    this.entries.push(entry);

    // Prune oldest if over cap
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(this.entries.length - MAX_ENTRIES);
    }

    this.save();
    return entry;
  }

  getAll(): ConversationEntry[] {
    return [...this.entries];
  }

  getRecent(count: number): ConversationEntry[] {
    return this.entries.slice(-count);
  }

  clear(): void {
    this.entries = [];
    this.save();
  }

  private async save(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
    } catch (err) {
      console.warn('[ConversationHistory] Failed to save:', err);
    }
  }
}

export const conversationHistory = new ConversationHistory();
