// Parse voice text into structured commands

export type CommandType =
  | 'send_message'
  | 'create_group'
  | 'call_group'
  | 'navigate'
  | 'open_chat'
  | 'private_chat'
  | 'whisper'
  | 'read_latest'
  | 'read_unread'
  | 'select_suggestion'
  | 'summarize'
  | 'start_ambient'
  | 'stop_ambient'
  | 'unknown';

export interface VoiceCommand {
  type: CommandType;
  payload: string;
  rawText: string;
  confidence: number;
}

interface CommandPattern {
  type: CommandType;
  patterns: RegExp[];
  extractPayload: (match: RegExpMatchArray) => string;
}

const commandPatterns: CommandPattern[] = [
  {
    type: 'send_message',
    patterns: [
      /^(?:send\s+message|say|tell\s+them|message)\s+(.+)$/i,
      /^(?:send|text)\s+(.+)$/i,
      // Gen Z: "drop [msg]", "yeet [msg]", "shoot [msg]", "spit [msg]"
      /^(?:drop|yeet|shoot|spit|fire\s+off)\s+(.+)$/i,
    ],
    extractPayload: (match) => match[1].trim(),
  },
  {
    type: 'create_group',
    patterns: [
      // Explicit: "create/new/make/start group called/named ..."
      /^(?:create|new|make|start)\s+(?:a\s+)?group\s+(?:called?|named)\s+(.+)$/i,
      // With privacy before group: "create private group saji ..."
      /^(?:create|new|make|start)\s+(?:a\s+)?(?:public|private)\s+group\s*(.*)$/i,
      // Standard: "create group ..."
      /^(?:create|new|make|start)\s+(?:a\s+)?group\s*(.*)$/i,
      // Natural: "group name is X ..."
      /^group\s+name\s+(?:is|it's)\s+(.+)$/i,
      // Natural: "group X it's a public/private ..."
      /^group\s+(.+?\b)\s+(?:it'?s|is)\s+(?:a\s+)?(?:public|private)\b(.*)$/i,
    ],
    extractPayload: (match) => {
      // For the last pattern, concat captured groups
      if (match[2] !== undefined) {
        const rest = match[2].trim();
        const nameAndRest = match[1].trim() + (rest ? " it's " + rest : '');
        return nameAndRest;
      }
      // For "create private group X ...", re-include privacy from the full match
      const full = match[0] || '';
      const captured = match[1]?.trim() || '';
      if (/(?:public|private)\s+group/i.test(full)) {
        const privacyWord = full.match(/\b(public|private)\s+group/i)?.[1] || '';
        return privacyWord ? privacyWord + ' ' + captured : captured;
      }
      return captured;
    },
  },
  {
    type: 'call_group',
    patterns: [
      /^(?:call|start\s+call|voice\s+call|video\s+call)\s*(.*)$/i,
      // Gen Z: "hop on call", "link up", "pull up on call"
      /^(?:hop\s+on(?:\s+call)?|link\s+up)\s*(.*)$/i,
    ],
    extractPayload: (match) => match[1]?.trim() || '',
  },
  {
    type: 'navigate',
    patterns: [
      /^(?:go\s+to|open|show|switch\s+to)\s+(groups?|chats?|profile|settings|home)$/i,
    ],
    extractPayload: (match) => match[1].toLowerCase().replace(/s$/, ''),
  },
  {
    type: 'private_chat',
    patterns: [
      // "private chat with John", "privately message John"
      /^(?:private\s+chat\s+with|privately\s+message|privately\s+talk\s+to|private\s+message)\s+(.+?)(?:\s+in\s+.+)?$/i,
      // "DM John", "DM John in Poker", "direct message John"
      /^(?:dm|direct\s+message)\s+(.+?)(?:\s+in\s+.+)?$/i,
      // "speak privately with John", "talk privately with John"
      /^(?:speak|talk|chat)\s+privately\s+(?:with|to)\s+(.+?)(?:\s+in\s+.+)?$/i,
      // "slide into DMs with John", "lowkey message John"
      /^(?:slide\s+into\s+(?:dms?\s+(?:with|of))|lowkey\s+(?:message|text|hit\s+up))\s+(.+?)(?:\s+in\s+.+)?$/i,
    ],
    extractPayload: (match) => match[1].trim(),
  },
  {
    type: 'whisper',
    patterns: [
      // "whisper to John and Sarah hey what's up"
      /^whisper\s+to\s+(.+?)\s+(?:that|say|saying)\s+(.+)$/i,
      // "whisper to John and Sarah" (no message body yet)
      /^whisper\s+to\s+(.+)$/i,
      // "whisper hey what's up" (message to selected members, targets chosen via UI)
      /^whisper\s+(.+)$/i,
    ],
    extractPayload: (match) => {
      // Pattern with both targets and message
      if (match[2] !== undefined) {
        return JSON.stringify({ targets: match[1].trim(), message: match[2].trim() });
      }
      // "whisper to [names]" — check if it came from the "to" pattern
      const raw = match[0] || '';
      if (/^whisper\s+to\s+/i.test(raw)) {
        return JSON.stringify({ targets: match[1].trim(), message: '' });
      }
      // "whisper [message]" — no explicit targets
      return JSON.stringify({ targets: '', message: match[1].trim() });
    },
  },
  {
    type: 'read_latest',
    patterns: [
      /^(?:read\s+(?:the\s+)?(?:latest|last|newest|most\s+recent)\s+message)$/i,
      /^(?:what'?s?\s+the\s+latest\s+message)$/i,
      /^(?:read\s+(?:the\s+)?latest)$/i,
      // Gen Z: "what dropped", "what's good", "what's the tea"
      /^(?:what\s+dropped|what'?s\s+good|what'?s\s+the\s+tea)$/i,
    ],
    extractPayload: () => '',
  },
  {
    type: 'read_unread',
    patterns: [
      /^(?:read\s+(?:the\s+)?(?:unread|new)\s+messages?)$/i,
      /^(?:read\s+(?:all\s+)?messages?)$/i,
      /^(?:catch\s+me\s+up)$/i,
      /^(?:what\s+did\s+I\s+miss)$/i,
      // Gen Z: "put me on", "fill me in", "I got FOMO"
      /^(?:put\s+me\s+on|fill\s+me\s+in|i\s+got\s+fomo)$/i,
    ],
    extractPayload: () => '',
  },
  {
    type: 'select_suggestion',
    patterns: [
      /^(?:option|suggestion|use\s+suggestion|pick\s+option|select)\s+(\d)$/i,
      /^(?:number)\s+(\d)$/i,
      // Gen Z: "bet on 1", "go with 2"
      /^(?:bet\s+on|go\s+with)\s+(\d)$/i,
    ],
    extractPayload: (match) => match[1],
  },
  {
    type: 'summarize',
    patterns: [
      /^(?:summarize|summarise)\s+(?:the\s+)?(?:conversation|chat|discussion)$/i,
      /^(?:give\s+me\s+a\s+summary)$/i,
      /^(?:what'?s?\s+(?:the\s+)?(?:summary|recap|tldr))$/i,
      // Gen Z: "give me the rundown", "spill the recap", "tldr fr"
      /^(?:give\s+me\s+the\s+rundown|spill\s+the\s+recap|tldr\s+fr)$/i,
    ],
    extractPayload: () => '',
  },
  {
    type: 'start_ambient',
    patterns: [
      /^(?:start|begin|enable)\s+(?:ambient|background)\s+(?:conversation|listening|mode)$/i,
      /^(?:ambient\s+mode\s+on)$/i,
      // Gen Z: "vibes on", "chill mode"
      /^(?:vibes\s+on|chill\s+mode(?:\s+on)?)$/i,
    ],
    extractPayload: () => '',
  },
  {
    type: 'stop_ambient',
    patterns: [
      /^(?:stop|end|disable)\s+(?:ambient|background)\s+(?:conversation|listening|mode)$/i,
      /^(?:ambient\s+mode\s+off)$/i,
      // Gen Z: "vibes off", "chill mode off"
      /^(?:vibes\s+off|chill\s+mode\s+off)$/i,
    ],
    extractPayload: () => '',
  },
  {
    type: 'open_chat',
    patterns: [
      // "chat with John", "chat with John in Poker"
      /^(?:open\s+chat\s+with|talk\s+to|chat\s+with|message)\s+(.+?)(?:\s+in\s+.+)?$/i,
      // "hit up John", "slide into John", "pull up on John"
      /^(?:hit\s+up|slide\s+into|pull\s+up\s+on)\s+(.+?)(?:\s+in\s+.+)?$/i,
    ],
    extractPayload: (match) => match[1].trim(),
  },
];

/**
 * Pre-process speech text to fix common recognition errors.
 */
function fixSpeechErrors(text: string): string {
  return text
    // "grow" → "group" (common mishearing)
    .replace(/\bpublic\s+grow\b/gi, 'public group')
    .replace(/\bprivate\s+grow\b/gi, 'private group')
    // "a patrol approval" → "approval"
    .replace(/\ba\s+patrol\s+approval\b/gi, 'approval')
    // "request draw approval" → "requires approval"
    .replace(/\brequest\s+draw\s+approval\b/gi, 'requires approval')
    // "requires to draw approval" → "requires approval"
    .replace(/\brequires?\s+to\s+draw\s+approval\b/gi, 'requires approval')
    // "approved" → "approval" when followed by "for"
    .replace(/\bapproved\s+for\b/gi, 'approval for')
    // "Crow" → "group" in context
    .replace(/\bpublic\s+Crow\b/gi, 'public group');
}

/**
 * Strip conversational prefixes so commands are recognized.
 * e.g. "can you send message to saji" → "send message to saji"
 *      "hey gossip please create group" → "create group"
 *      "yo could you call" → "call"
 */
function stripConversationalPrefix(text: string): string {
  return text
    .replace(
      /^(?:hey\s+(?:gossip\s*)?|hi\s+(?:gossip\s*)?|hello\s+(?:gossip\s*)?|yo\s+|ayo\s+|ayy\s+|ok\s+|okay\s+)?(?:i\s+want\s+to\s+|i\s+wanna\s+|i\s+need\s+to\s+|i'd\s+like\s+to\s+|let\s+me\s+|can\s+you\s+|could\s+you\s+|would\s+you\s+|will\s+you\s+|please\s+|can\s+i\s+|let's\s+)?(?:just\s+|quickly\s+)?/i,
      '',
    )
    .replace(/\s+please\s*$/i, '') // trailing "please"
    .trim();
}

export function parseCommand(text: string): VoiceCommand {
  const trimmed = fixSpeechErrors(text.trim());
  const stripped = stripConversationalPrefix(trimmed);

  // Try both original and prefix-stripped versions
  const candidates = stripped !== trimmed ? [stripped, trimmed] : [trimmed];

  for (const candidate of candidates) {
    const result = matchPatterns(candidate);
    if (result) return result;
  }

  // Fallback: if the text contains group creation keywords, treat as create_group
  if (/\bgroup\b/i.test(trimmed) && (/\bpublic\b|\bprivate\b|\bapproval\b|\bname\s+is\b/i.test(trimmed))) {
    const payload = extractGroupSettings(trimmed);
    return {
      type: 'create_group',
      payload,
      rawText: trimmed,
      confidence: 0.7,
    };
  }

  return {
    type: 'unknown',
    payload: trimmed,
    rawText: trimmed,
    confidence: 0,
  };
}

function matchPatterns(text: string): VoiceCommand | null {
  for (const cmd of commandPatterns) {
    for (const pattern of cmd.patterns) {
      const match = text.match(pattern);
      if (match) {
        let payload = cmd.extractPayload(match);

        // For create_group, extract settings from natural language
        if (cmd.type === 'create_group' && payload) {
          payload = extractGroupSettings(payload);
        }

        return {
          type: cmd.type,
          payload,
          rawText: text,
          confidence: 0.9,
        };
      }
    }
  }

  return null;
}

/**
 * Parse natural language group creation into a JSON payload.
 * Handles various phrasings:
 *   "friends it's a public group and requires approval for new members"
 *   "friend"  (just a name)
 */
function extractGroupSettings(raw: string): string {
  let text = raw;
  let privacy: 'public' | 'private' | undefined;
  let requireApproval: boolean | undefined;

  // Check for privacy keywords
  if (/\bprivate\b/i.test(text)) {
    privacy = 'private';
  } else if (/\bpublic\b/i.test(text)) {
    privacy = 'public';
  }

  // Check for approval keywords (flexible matching)
  if (/\brequired?\s+approval\b/i.test(text) ||
      /\bapproval\s+required\b/i.test(text) ||
      /\bwith\s+(?:required\s+)?approval\b/i.test(text) ||
      /\bapproval\s+for\s+new\b/i.test(text) ||
      /\brequired?\s+.*?approval\b/i.test(text) ||
      /\brequires?\s+approval\b/i.test(text)) {
    requireApproval = true;
  } else if (/\bno\s+approval\b/i.test(text) || /\bwithout\s+approval\b/i.test(text)) {
    requireApproval = false;
  }

  // If no settings were found, treat the whole string as the group name
  if (privacy === undefined && requireApproval === undefined) {
    return text;
  }

  // Extract group name by stripping setting phrases
  let name = text
    // Remove leading command words: "create/new/make/start [a]"
    .replace(/^(?:create|new|make|start)\s+(?:a\s+)?/i, '')
    // Remove "group name is" prefix
    .replace(/^group\s+name\s+(?:is|it's)\s+/i, '')
    // Remove "it's a public/private group"
    .replace(/\b(it'?s\s+)?a?\s*(public|private)\s*(group|grow|Crow)?\b/gi, '')
    // Remove approval phrases (including "required approval", "with required approval")
    .replace(/\b(and\s+)?(require[sd]?\s+.*?approval|approval\s+required|with\s+(?:required\s+)?approval|no\s+approval|without\s+approval)(\s+for\s+new\s+members?)?\b/gi, '')
    // Remove orphan "and", "with", "called", "named"
    .replace(/\b(and|with|called|named)\b/gi, '')
    // Remove "for new members"
    .replace(/\bfor\s+new\s+members?\b/gi, '')
    // Remove standalone "group" word
    .replace(/\bgroup\b/gi, '')
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // If name is empty after stripping, use the raw text before settings
  if (!name) {
    name = '';
  }

  // Build JSON payload
  const settings: any = { name };
  if (privacy !== undefined) settings.privacy = privacy;
  if (requireApproval !== undefined) settings.requireApproval = requireApproval;

  return JSON.stringify(settings);
}

export type ScreenContext = 'chat_list' | 'chat_room' | 'create_group' | 'settings' | 'auth' | 'global';

export function getSuggestions(context: ScreenContext): string[] {
  switch (context) {
    case 'chat_list':
      return [
        '"Create group [name]"',
        '"Chat with [name]"',
        '"DM [name]"',
        '"Go to settings"',
      ];
    case 'chat_room':
      return [
        '"Send [message]"',
        '"Option 1" / "Option 2"',
        '"Summarize the chat"',
        '"Start ambient mode"',
        '"Read latest message"',
        '"Whisper to [name] [message]"',
        '"Call" / "Start call"',
      ];
    case 'create_group':
      return [
        '"Create group [name]"',
        '"Go to chats"',
      ];
    case 'global':
      return [
        '"Create group"',
        '"Go to chats"',
        '"Chat with [name]"',
        '"DM [name]"',
      ];
    default:
      return ['"Send [message]"', '"Create group"'];
  }
}
