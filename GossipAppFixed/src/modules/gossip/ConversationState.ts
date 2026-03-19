import { PendingClarification, GossipIntent, GossipOption } from './types';

const EXPIRY_MS = 30_000; // 30 seconds
const MAX_TURNS = 5;

class ConversationState {
  private pending: PendingClarification | null = null;

  setPending(
    originalText: string,
    intent: GossipIntent,
    options: GossipOption[],
  ): void {
    this.pending = {
      originalText,
      intent,
      options,
      createdAt: Date.now(),
      turnCount: 0,
    };
  }

  getPending(): PendingClarification | null {
    if (!this.pending) return null;

    // Auto-expire after EXPIRY_MS
    if (Date.now() - this.pending.createdAt > EXPIRY_MS) {
      this.pending = null;
      return null;
    }

    return this.pending;
  }

  /** Returns false if max turns exceeded (prevents loops). */
  incrementTurn(): boolean {
    if (!this.pending) return false;
    this.pending.turnCount += 1;
    // Refresh the timer on each interaction
    this.pending.createdAt = Date.now();
    return this.pending.turnCount <= MAX_TURNS;
  }

  reset(): void {
    this.pending = null;
  }
}

export const conversationState = new ConversationState();
