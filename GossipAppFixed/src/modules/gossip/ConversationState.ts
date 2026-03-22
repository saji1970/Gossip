import { PendingClarification, GossipIntent, GossipOption, ExtractedEntity, EntityType } from './types';

const EXPIRY_MS = 30_000; // 30 seconds
const MAX_TURNS = 5;

class ConversationState {
  private pending: PendingClarification | null = null;

  setPending(
    originalText: string,
    intent: GossipIntent,
    options: GossipOption[],
    entities: ExtractedEntity[] = [],
    missingEntities: EntityType[] = [],
  ): void {
    this.pending = {
      originalText,
      intent,
      options,
      createdAt: Date.now(),
      turnCount: 0,
      entities,
      missingEntities,
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

  /**
   * Merge new entities into the pending clarification and remove
   * satisfied types from missingEntities.
   */
  mergeEntities(newEntities: ExtractedEntity[]): void {
    if (!this.pending) return;
    for (const entity of newEntities) {
      // Replace existing entity of same type, or add new
      const idx = this.pending.entities.findIndex(e => e.type === entity.type);
      if (idx >= 0) {
        this.pending.entities[idx] = entity;
      } else {
        this.pending.entities.push(entity);
      }
      // Remove from missing
      this.pending.missingEntities = this.pending.missingEntities.filter(
        t => t !== entity.type,
      );
    }
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
