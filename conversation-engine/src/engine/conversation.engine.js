import { parseIntent } from './intent.parser.js';
import * as contextManager from './context.manager.js';
import { processDialogue } from './dialogue.manager.js';
import { executeAction } from './action.executor.js';
import { logger } from '../config/logger.js';

/**
 * Conversation Engine — the single entry point for processing user messages.
 *
 * Flow:
 *   1. Load user context from Redis
 *   2. Parse intent via LLM
 *   3. Run dialogue manager (decides action vs reply vs confirmation)
 *   4. Execute action if needed
 *   5. Update context
 *   6. Return reply
 */
export async function chat(userId, message) {
  const start = Date.now();

  // 1. Load context
  const ctx = await contextManager.getContext(userId);

  // Record user message in history
  await contextManager.addToHistory(userId, 'user', message);

  // 2. Parse intent
  const parsed = await parseIntent(message, {
    pendingAction: ctx.pendingAction,
    currentGroup: ctx.currentGroup,
  });

  logger.info({
    userId,
    message: message.slice(0, 80),
    intent: parsed.intent,
    confidence: parsed.confidence,
  }, 'conversation turn');

  // 3. Dialogue manager
  const dialogue = await processDialogue(userId, parsed, ctx);

  // 4. If dialogue returned an immediate reply (no action needed)
  if (dialogue.reply && !dialogue.action) {
    await contextManager.addToHistory(userId, 'assistant', dialogue.reply);

    return {
      reply: dialogue.reply,
      intent: parsed.intent,
      needsConfirmation: dialogue.needsConfirmation || false,
      nextActions: dialogue.nextActions || [],
      latency: Date.now() - start,
    };
  }

  // 5. Execute the action
  if (dialogue.action) {
    const result = await executeAction(userId, dialogue.action, dialogue.params);

    const reply = result.reply || 'Done!';
    await contextManager.addToHistory(userId, 'assistant', reply);

    // Update last intent
    const updatedCtx = await contextManager.getContext(userId);
    updatedCtx.lastIntent = parsed.intent;
    await contextManager.setContext(userId, updatedCtx);

    return {
      reply,
      intent: parsed.intent,
      action: dialogue.action,
      success: result.success,
      data: result.data || {},
      nextActions: result.nextActions || [],
      latency: Date.now() - start,
    };
  }

  // Fallback
  const fallback = "I'm not sure what to do with that. Try 'create a group' or 'add a member'.";
  await contextManager.addToHistory(userId, 'assistant', fallback);

  return {
    reply: fallback,
    intent: parsed.intent,
    latency: Date.now() - start,
  };
}
