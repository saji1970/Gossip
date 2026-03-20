import OpenAI from 'openai';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

const openai = new OpenAI({ apiKey: config.openaiKey });

const SYSTEM_PROMPT = `You are an intent classifier for a social chat app called Gossip.
Convert the user's message into structured JSON.

Supported intents:
- create_group: User wants to create a new group
- add_member: User wants to add someone to a group
- send_invite: User wants to send an invite email
- confirm_action: User says yes/no/confirm/cancel to a pending action
- casual_chat: Greetings, small talk, questions about the bot

Rules:
- Always return valid JSON with "intent" field
- Extract all relevant entities: group_name, privacy, approval_required, member_name, member_email
- If user confirms (yes/yeah/sure/ok/do it), intent = confirm_action with confirmed = true
- If user denies (no/nope/cancel/nevermind), intent = confirm_action with confirmed = false
- For create_group: extract group_name, privacy (default "private"), approval_required (default false)
- For add_member: extract member_name, member_email, group_name (if mentioned)
- For send_invite: extract member_email, group_name
- confidence should be 0.0 to 1.0

Return ONLY valid JSON. No markdown, no explanation.`;

export async function parseIntent(message, contextHint = {}) {
  const start = Date.now();

  const userPrompt = contextHint.pendingAction
    ? `Current pending action: ${JSON.stringify(contextHint.pendingAction)}\n\nUser said: "${message}"`
    : `User said: "${message}"`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 300,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });

    const raw = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);
    const latency = Date.now() - start;

    logger.info({ intent: parsed.intent, latency, message: message.slice(0, 60) }, 'intent parsed');

    return {
      intent: parsed.intent || 'casual_chat',
      group_name: parsed.group_name || null,
      privacy: parsed.privacy || 'private',
      approval_required: parsed.approval_required || false,
      member_name: parsed.member_name || null,
      member_email: parsed.member_email || null,
      confirmed: parsed.confirmed ?? null,
      confidence: parsed.confidence ?? 0.8,
      raw: parsed,
    };
  } catch (err) {
    logger.error({ err, message: message.slice(0, 60) }, 'intent parse failed');
    return {
      intent: 'casual_chat',
      confidence: 0,
      error: err.message,
    };
  }
}
